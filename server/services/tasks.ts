import "server-only";
import { and, asc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { isBacklogTask, planBacklogReorder } from "@/lib/domain/backlog";
import { NewTaskSchema, TaskSchema, type NewTask, type Subtask, type Task } from "@/lib/types";
import { labels, subtasks, taskLabels, tasks } from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import type { ServiceContext } from "@/server/services/context";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/services/errors";
import {
  parseRows,
  rowToTask,
  subtasksToRows,
  taskToRow,
  type SubtaskRow,
} from "@/server/services/mappers";
import { occurrenceServices } from "@/server/services/occurrences";
import { isUuid, lockUserScope } from "@/server/services/shared";

/** Fields callers may change after creation (same as `lib/db`). */
export type TaskPatch = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;

/** Task services (#406) — the server twin of `lib/db/tasks.ts`. */
export function taskServices(ctx: ServiceContext) {
  const { db, userId, source } = ctx;
  const live = and(eq(tasks.userId, userId), isNull(tasks.deletedAt));

  /**
   * The user's live tasks matching `where`, oldest first, with their labels and subtasks:
   * three queries for any number of tasks (no N+1). Label ids come in label order
   * (oldest label first) — the link table has no position of its own.
   */
  async function loadTasks(tx: Database, where?: SQL): Promise<Task[]> {
    const condition = where ? and(live, where) : live;
    const rows = await tx
      .select()
      .from(tasks)
      .where(condition)
      .orderBy(asc(tasks.createdAt), asc(tasks.id));
    if (rows.length === 0) return [];

    const links = await tx
      .select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
      .from(taskLabels)
      .innerJoin(tasks, eq(tasks.id, taskLabels.taskId))
      .innerJoin(labels, eq(labels.id, taskLabels.labelId))
      .where(condition)
      .orderBy(asc(labels.createdAt), asc(labels.id));
    const subtaskRows = await tx
      .select({ subtask: subtasks })
      .from(subtasks)
      .innerJoin(tasks, eq(tasks.id, subtasks.taskId))
      .where(condition);

    const labelIdsOf = new Map<string, string[]>();
    for (const { taskId, labelId } of links) {
      labelIdsOf.set(taskId, [...(labelIdsOf.get(taskId) ?? []), labelId]);
    }
    const subtasksOf = new Map<string, SubtaskRow[]>();
    for (const { subtask } of subtaskRows) {
      subtasksOf.set(subtask.taskId, [...(subtasksOf.get(subtask.taskId) ?? []), subtask]);
    }
    return parseRows(
      TaskSchema,
      "task",
      rows.map((row) => rowToTask(row, labelIdsOf.get(row.id) ?? [], subtasksOf.get(row.id) ?? [])),
    );
  }

  async function loadTask(tx: Database, id: string): Promise<Task | undefined> {
    return isUuid(id) ? (await loadTasks(tx, eq(tasks.id, id)))[0] : undefined;
  }

  /**
   * Label ids for a task: another user's or an unknown id is refused, an own label that
   * was deleted meanwhile (stale tab, second device) is dropped silently. Keeps the order.
   */
  async function checkLabelIds(tx: Database, labelIds: string[]): Promise<string[]> {
    const unique = [...new Set(labelIds)];
    const foreign = unique.find((id) => !isUuid(id));
    if (foreign !== undefined) throw new ForbiddenError(`Unknown label ${foreign}`);
    if (unique.length === 0) return [];
    const owned = await tx
      .select({ id: labels.id, deletedAt: labels.deletedAt })
      .from(labels)
      .where(and(eq(labels.userId, userId), inArray(labels.id, unique)));
    const byId = new Map(owned.map((label) => [label.id, label]));
    const unknown = unique.find((id) => !byId.has(id));
    if (unknown !== undefined) throw new ForbiddenError(`Unknown label ${unknown}`);
    return unique.filter((id) => byId.get(id)?.deletedAt === null);
  }

  async function writeLabelLinks(tx: Database, taskId: string, labelIds: string[]) {
    await tx.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
    if (labelIds.length > 0) {
      await tx.insert(taskLabels).values(labelIds.map((labelId) => ({ taskId, labelId })));
    }
  }

  /** Replaces the task's subtasks; fresh `sort_order` keys keep the array order. */
  async function writeSubtasks(tx: Database, taskId: string, list: Subtask[]) {
    const ids = list.map((subtask) => subtask.id);
    const invalid = list.findIndex(
      (subtask, i) => !isUuid(subtask.id) || ids.indexOf(subtask.id) !== i,
    );
    if (invalid !== -1) {
      throw new ValidationError("task", [
        { path: `subtasks.${invalid}.id`, message: "Subtask ids must be unique uuids" },
      ]);
    }
    await tx.delete(subtasks).where(eq(subtasks.taskId, taskId));
    if (list.length > 0) await tx.insert(subtasks).values(subtasksToRows(taskId, userId, list));
  }

  /** Tops up series occurrences first, at most once per local day (#312). */
  async function getTasks(): Promise<Task[]> {
    await occurrenceServices(ctx).ensureOccurrences();
    return loadTasks(db);
  }

  async function getTask(id: string): Promise<Task | undefined> {
    return loadTask(db, id);
  }

  async function createTask(input: NewTask): Promise<Task> {
    const parsed = NewTaskSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("task", parsed.error);
    if (parsed.data.seriesId !== null) {
      throw new ValidationError("task", [
        { path: "seriesId", message: "Occurrences are created by their series" },
      ]);
    }
    const now = new Date().toISOString();
    const task: Task = {
      ...parsed.data,
      id: crypto.randomUUID(),
      status: "open",
      completedAt: null,
      sortOrder: null, // new tasks land at the bottom of the Backlog (#75)
      createdAt: now,
      updatedAt: now,
    };
    return db.transaction(async (tx) => {
      const labelIds = await checkLabelIds(tx, task.labelIds);
      await tx.insert(tasks).values(taskToRow(task, { userId, source }));
      await writeSubtasks(tx, task.id, task.subtasks);
      await writeLabelLinks(tx, task.id, labelIds);
      return (await loadTask(tx, task.id)) as Task;
    });
  }

  /**
   * Like `lib/db`, plus the rules the schema leaves to code: `completedAt` belongs to the
   * server (set when a task becomes done, kept while it stays done, cleared otherwise),
   * and `seriesId` can't change here — detaching is a series operation (#407).
   */
  async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
    return db.transaction(async (tx) => {
      const current = await loadTask(tx, id);
      if (!current) throw new NotFoundError("task", id);
      const changes = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      ) as TaskPatch;
      if ("seriesId" in changes && changes.seriesId !== current.seriesId) {
        throw new ValidationError("task", [
          { path: "seriesId", message: "A task can't move to another series" },
        ]);
      }
      const status = changes.status ?? current.status;
      const result = TaskSchema.safeParse({
        ...current,
        ...changes,
        id: current.id,
        seriesId: current.seriesId,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
        completedAt:
          status !== "done"
            ? null
            : current.status === "done"
              ? current.completedAt
              : new Date().toISOString(),
      });
      if (!result.success) throw new ValidationError("task", result.error);
      const next = result.data;

      if (changes.labelIds !== undefined) {
        await writeLabelLinks(tx, id, await checkLabelIds(tx, next.labelIds));
      }
      if (changes.subtasks !== undefined) await writeSubtasks(tx, id, next.subtasks);

      const row = taskToRow(next, { userId, source });
      await tx
        .update(tasks)
        .set({
          title: row.title,
          notes: row.notes,
          status: row.status,
          priority: row.priority,
          dueDate: row.dueDate,
          allDay: row.allDay,
          completedAt: row.completedAt,
          sortOrder: row.sortOrder,
          updatedAt: row.updatedAt,
        })
        .where(and(live, eq(tasks.id, id)));
      return (await loadTask(tx, id)) as Task;
    });
  }

  /** Soft delete: subtasks and links stay with the row, reads skip it. */
  async function deleteTask(id: string): Promise<void> {
    if (!isUuid(id)) throw new NotFoundError("task", id);
    const now = new Date();
    const deleted = await db
      .update(tasks)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(live, eq(tasks.id, id)))
      .returning({ id: tasks.id });
    if (deleted.length === 0) throw new NotFoundError("task", id);
  }

  /**
   * Moves a Backlog task between two neighbours (#75) — `planBacklogReorder` decides the
   * keys, written in one transaction. A per-user lock keeps two drags at the same moment
   * from computing the same key.
   */
  async function reorderBacklogTask(
    id: string,
    prevId: string | null,
    nextId: string | null,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await lockUserScope(tx, "backlog", userId);
      const backlog = (
        await loadTasks(
          tx,
          and(eq(tasks.status, "open"), isNull(tasks.dueDate), isNull(tasks.seriesId)),
        )
      ).filter(isBacklogTask);
      let keys: Map<string, string>;
      try {
        keys = planBacklogReorder(backlog, id, prevId, nextId);
      } catch (error) {
        throw new ValidationError("reorder", [
          { path: "id", message: error instanceof Error ? error.message : String(error) },
        ]);
      }
      const now = new Date();
      for (const [taskId, sortOrder] of keys) {
        await tx
          .update(tasks)
          .set({ sortOrder, updatedAt: now })
          .where(and(live, eq(tasks.id, taskId)));
      }
    });
  }

  return { getTasks, getTask, createTask, updateTask, deleteTask, reorderBacklogTask };
}
