import "server-only";
import { and, count, eq, isNull } from "drizzle-orm";
import { buildBackup, parseBackup, serializeBackup, type BackupData } from "@/lib/domain/backup";
import { localDayIn } from "@/lib/domain/occurrencePlan";
import type { Task } from "@/lib/types";
import {
  appSettings,
  labels,
  seriesLabels,
  subtasks,
  taskLabels,
  taskSeries,
  tasks,
} from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import type { ServiceContext } from "@/server/services/context";
import { ValidationError } from "@/server/services/errors";
import { labelServices } from "@/server/services/labels";
import {
  labelToRow,
  seriesToRow,
  subtasksToRows,
  taskToRow,
  type SubtaskInsert,
  type TaskInsert,
} from "@/server/services/mappers";
import { occurrenceServices } from "@/server/services/occurrences";
import { seriesServices } from "@/server/services/series";
import { settingsServices } from "@/server/services/settings";
import { taskServices } from "@/server/services/tasks";

export type DataCounts = { tasks: number; taskSeries: number; labels: number };

/** Postgres allows 65,535 bind parameters per statement — tasks have ~16 columns. */
const CHUNK = 500;
const chunks = <T>(rows: T[]): T[][] =>
  Array.from({ length: Math.ceil(rows.length / CHUNK) }, (_, i) =>
    rows.slice(i * CHUNK, (i + 1) * CHUNK),
  );

/** done > skipped > open: which of two occurrences on the same day keeps the slot. */
const STATUS_RANK: Record<Task["status"], number> = { done: 0, skipped: 1, open: 2 };

/** Backup services (#408) — the server twin of `lib/db/backup.ts`. */
export function backupServices(ctx: ServiceContext) {
  const { db, userId } = ctx;

  /**
   * Everything the user has, in the backup shape (format v3 unchanged): soft-deleted rows
   * aren't exported, and neither is the time zone. One repeatable-read transaction, so the
   * tables are a consistent snapshot.
   */
  async function exportAll(): Promise<BackupData> {
    await occurrenceServices(ctx).ensureOccurrences();
    return db.transaction(
      async (tx) => {
        const txCtx = { ...ctx, db: tx };
        const [taskList, seriesList, labelList, settings] = await Promise.all([
          taskServices(txCtx).getTasks(),
          seriesServices(txCtx).listTaskSeries(),
          labelServices(txCtx).getLabels(),
          settingsServices(txCtx).getSettings(),
        ]);
        return {
          tasks: taskList,
          taskSeries: seriesList,
          labels: labelList,
          settings: { id: "app", statsSince: settings.statsSince },
        };
      },
      { isolationLevel: "repeatable read" },
    );
  }

  /** Counts of what the user sees (soft-deleted rows don't count). */
  async function getDataCounts(): Promise<DataCounts> {
    const countLive = async (table: typeof tasks | typeof taskSeries | typeof labels) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(table)
        .where(and(eq(table.userId, userId), isNull(table.deletedAt)));
      return value;
    };
    const [taskCount, seriesCount, labelCount] = await Promise.all([
      countLive(tasks),
      countLive(taskSeries),
      countLive(labels),
    ]);
    return { tasks: taskCount, taskSeries: seriesCount, labels: labelCount };
  }

  /** Hard delete of the user's rows (tombstones included); subtasks and links cascade. */
  async function wipe(tx: Database, statsSince: Date | null) {
    await tx.delete(tasks).where(eq(tasks.userId, userId));
    await tx.delete(taskSeries).where(eq(taskSeries.userId, userId));
    await tx.delete(labels).where(eq(labels.userId, userId));
    await tx
      .update(appSettings)
      .set({ statsSince, occurrencesGeneratedOn: null, updatedAt: new Date() })
      .where(eq(appSettings.userId, userId));
  }

  /**
   * Wipes every task, series and label of the user — a **hard** delete, the one exception
   * to soft delete (the user asked for it to be gone). The settings row stays with its
   * time zone; the stats start date is reset (#226).
   */
  async function deleteAllData(): Promise<void> {
    await db.transaction((tx) => wipe(tx, null));
  }

  /**
   * Replaces all of the user's data with a backup, atomically: a failure leaves the old
   * data exactly as it was.
   *
   * - Validated again with `parseBackup` (rows, references) — the API gets it from outside.
   * - Every row gets a **fresh uuid**, references are rewritten through one map: the
   *   public demo file can be imported by any number of accounts, and old non-uuid ids
   *   don't matter.
   * - `occurrence_date` comes from the due date in the user's time zone. One occurrence
   *   per series and day keeps the slot (done > skipped > open); duplicates and series
   *   tasks without a due date become standalone tasks, so nothing is lost.
   * - `source = import`; `completedAt`, timestamps and order keys are kept as they are.
   *
   * Afterwards occurrences are topped up, best effort (the next `getTasks` catches up).
   */
  async function importAll(data: BackupData, now: Date = new Date()): Promise<void> {
    const parsed = parseBackup(serializeBackup(buildBackup(data, now)));
    if (!parsed.ok) {
      throw new ValidationError(
        "backup",
        parsed.errors.map((message) => ({ path: "", message })),
      );
    }
    const backup = parsed.backup.data;

    const [settingsRow] = await db
      .select({ timeZone: appSettings.timeZone })
      .from(appSettings)
      .where(eq(appSettings.userId, userId));
    if (!settingsRow) {
      throw new ValidationError("backup", [
        { path: "timeZone", message: "Save the time zone in the settings first" },
      ]);
    }
    const { timeZone } = settingsRow;

    const newId = new Map<string, string>();
    const remap = (id: string) => {
      if (!newId.has(id)) newId.set(id, crypto.randomUUID());
      return newId.get(id) as string;
    };
    const owner = { userId, source: "import" as const };

    // One occurrence per series and local day keeps its series.
    const slotOwner = new Map<string, Task>();
    for (const task of backup.tasks) {
      if (task.seriesId === null || task.dueDate === null) continue;
      const key = `${task.seriesId}|${localDayIn(timeZone, new Date(task.dueDate))}`;
      const holder = slotOwner.get(key);
      const better =
        !holder ||
        STATUS_RANK[task.status] < STATUS_RANK[holder.status] ||
        (STATUS_RANK[task.status] === STATUS_RANK[holder.status] &&
          task.createdAt < holder.createdAt);
      if (better) slotOwner.set(key, task);
    }
    const keepsSeries = new Set([...slotOwner.values()].map((task) => task.id));

    const labelRows = backup.labels.map((label) =>
      labelToRow({ ...label, id: remap(label.id) }, owner),
    );
    const seriesRows = backup.taskSeries.map((series) =>
      seriesToRow({ ...series, id: remap(series.id) }, owner),
    );
    const seriesLabelRows = backup.taskSeries.flatMap((series) =>
      series.labelIds.map((labelId) => ({ seriesId: remap(series.id), labelId: remap(labelId) })),
    );
    const taskRows: TaskInsert[] = [];
    const subtaskRows: SubtaskInsert[] = [];
    const taskLabelRows: { taskId: string; labelId: string }[] = [];
    for (const task of backup.tasks) {
      const id = remap(task.id);
      const inSeries = task.seriesId !== null && keepsSeries.has(task.id);
      taskRows.push(
        taskToRow(
          { ...task, id, seriesId: inSeries ? remap(task.seriesId as string) : null },
          owner,
          inSeries ? localDayIn(timeZone, new Date(task.dueDate as string)) : null,
        ),
      );
      subtaskRows.push(
        ...subtasksToRows(
          id,
          userId,
          task.subtasks.map((subtask) => ({ ...subtask, id: crypto.randomUUID() })),
        ),
      );
      taskLabelRows.push(
        ...task.labelIds.map((labelId) => ({ taskId: id, labelId: remap(labelId) })),
      );
    }

    await db.transaction(async (tx) => {
      await wipe(tx, backup.settings.statsSince ? new Date(backup.settings.statsSince) : null);
      for (const rows of chunks(labelRows)) await tx.insert(labels).values(rows);
      for (const rows of chunks(seriesRows)) await tx.insert(taskSeries).values(rows);
      for (const rows of chunks(seriesLabelRows)) await tx.insert(seriesLabels).values(rows);
      for (const rows of chunks(taskRows)) await tx.insert(tasks).values(rows);
      for (const rows of chunks(subtaskRows)) await tx.insert(subtasks).values(rows);
      for (const rows of chunks(taskLabelRows)) await tx.insert(taskLabels).values(rows);
    });

    try {
      await occurrenceServices(ctx).generateOccurrences(now);
    } catch (error) {
      console.warn("Imported the backup, but topping up recurring occurrences failed", error);
    }
  }

  return { exportAll, getDataCounts, importAll, deleteAllData };
}
