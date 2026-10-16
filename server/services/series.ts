import "server-only";
import { and, asc, count, eq, gte, inArray, isNotNull, isNull, type SQL } from "drizzle-orm";
import { keysBetween } from "@/lib/domain/orderKey";
import { planOccurrences, startOfLocalDay } from "@/lib/domain/occurrencePlan";
import {
  NewTaskSeriesSchema,
  TaskSeriesSchema,
  type NewTaskSeries,
  type TaskSeries,
} from "@/lib/types";
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
import { NotFoundError, ValidationError } from "@/server/services/errors";
import { parseRows, rowToSeries, seriesToRow } from "@/server/services/mappers";
import { occurrenceServices } from "@/server/services/occurrences";
import { checkLabelIds, isUuid, lockUserScope } from "@/server/services/shared";

/** Fields callers may change after creation (same as `lib/db`). */
export type TaskSeriesPatch = Partial<Omit<TaskSeries, "id" | "createdAt" | "updatedAt">>;

const sameList = (a: readonly unknown[], b: readonly unknown[]) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Series services (#407) — the server twin of `lib/db/taskSeries.ts`. */
export function seriesServices(ctx: ServiceContext) {
  const { db, userId, source } = ctx;
  const { topUpSeries } = occurrenceServices(ctx);
  const live = and(eq(taskSeries.userId, userId), isNull(taskSeries.deletedAt));
  const ownOccurrences = (seriesId: string) =>
    and(eq(tasks.userId, userId), eq(tasks.seriesId, seriesId));

  async function loadSeries(tx: Database, where?: SQL): Promise<TaskSeries[]> {
    const condition = where ? and(live, where) : live;
    const rows = await tx
      .select()
      .from(taskSeries)
      .where(condition)
      .orderBy(asc(taskSeries.createdAt), asc(taskSeries.id));
    if (rows.length === 0) return [];
    const links = await tx
      .select({ seriesId: seriesLabels.seriesId, labelId: seriesLabels.labelId })
      .from(seriesLabels)
      .innerJoin(taskSeries, eq(taskSeries.id, seriesLabels.seriesId))
      .innerJoin(labels, eq(labels.id, seriesLabels.labelId))
      .where(condition)
      .orderBy(asc(labels.createdAt), asc(labels.id));
    return parseRows(
      TaskSeriesSchema,
      "series",
      rows.map((row) =>
        rowToSeries(
          row,
          links.filter((link) => link.seriesId === row.id).map((link) => link.labelId),
        ),
      ),
    );
  }

  async function loadOne(tx: Database, id: string): Promise<TaskSeries | undefined> {
    return isUuid(id) ? (await loadSeries(tx, eq(taskSeries.id, id)))[0] : undefined;
  }

  /** Series rules are about the user's local days — no time zone, no series write. */
  async function requireTimeZone(tx: Database): Promise<string> {
    const [row] = await tx
      .select({ timeZone: appSettings.timeZone })
      .from(appSettings)
      .where(eq(appSettings.userId, userId));
    if (!row) {
      throw new ValidationError("series", [
        { path: "timeZone", message: "Save the time zone in the settings first" },
      ]);
    }
    return row.timeZone;
  }

  async function writeSeriesLabels(tx: Database, seriesId: string, labelIds: string[]) {
    await tx.delete(seriesLabels).where(eq(seriesLabels.seriesId, seriesId));
    if (labelIds.length > 0) {
      await tx.insert(seriesLabels).values(labelIds.map((labelId) => ({ seriesId, labelId })));
    }
  }

  /** Open occurrences due from the start of the user's local day on (#63, #148). */
  const upcomingOpen = (seriesId: string, startOfToday: Date) =>
    and(
      ownOccurrences(seriesId),
      eq(tasks.status, "open"),
      isNotNull(tasks.dueDate),
      gte(tasks.dueDate, startOfToday),
    );

  async function listTaskSeries(): Promise<TaskSeries[]> {
    return loadSeries(db);
  }

  async function getTaskSeries(id: string): Promise<TaskSeries | undefined> {
    return loadOne(db, id);
  }

  /**
   * Creates the series and its occurrences in one transaction. On the server both entry
   * points generate right away — the lazy trigger only runs once a day, so a series
   * without occurrences would stay empty until tomorrow.
   */
  async function createTaskSeries(input: NewTaskSeries, now: Date = new Date()) {
    const parsed = NewTaskSeriesSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("series", parsed.error);
    const stamp = now.toISOString();
    const series: TaskSeries = {
      ...parsed.data,
      id: crypto.randomUUID(),
      createdAt: stamp,
      updatedAt: stamp,
    };
    return db.transaction(async (tx) => {
      const timeZone = await requireTimeZone(tx);
      const labelIds = await checkLabelIds(tx, userId, series.labelIds);
      await tx.insert(taskSeries).values(seriesToRow(series, { userId, source }));
      await writeSeriesLabels(tx, series.id, labelIds);
      const created = (await loadOne(tx, series.id)) as TaskSeries;
      await topUpSeries(tx, created, timeZone, now);
      return created;
    });
  }

  const createTaskSeriesWithOccurrences = createTaskSeries;

  /** Validates and writes a patch; returns the series before and after. */
  async function writePatch(tx: Database, id: string, patch: TaskSeriesPatch) {
    const current = await loadOne(tx, id);
    if (!current) throw new NotFoundError("series", id);
    const changes = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    const result = TaskSeriesSchema.safeParse({
      ...current,
      ...changes,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    });
    if (!result.success) throw new ValidationError("series", result.error);
    const next = result.data;
    if (patch.labelIds !== undefined) {
      await writeSeriesLabels(tx, id, await checkLabelIds(tx, userId, next.labelIds));
    }
    const row = seriesToRow(next, { userId, source });
    await tx
      .update(taskSeries)
      .set({
        title: row.title,
        notes: row.notes,
        priority: row.priority,
        recurrence: row.recurrence,
        startDate: row.startDate,
        allDay: row.allDay,
        active: row.active,
        subtaskTemplate: row.subtaskTemplate,
        updatedAt: row.updatedAt,
      })
      .where(and(live, eq(taskSeries.id, id)));
    return { current, next: (await loadOne(tx, id)) as TaskSeries };
  }

  /**
   * Updates the template only (pause/resume, #61). Existing occurrences stay as they are;
   * resuming tops up right away instead of waiting for the next app load.
   */
  async function updateTaskSeries(
    id: string,
    patch: TaskSeriesPatch,
    now: Date = new Date(),
  ): Promise<TaskSeries> {
    return db.transaction(async (tx) => {
      const timeZone = await requireTimeZone(tx);
      await lockUserScope(tx, "series", userId);
      const { current, next } = await writePatch(tx, id, patch);
      if (!current.active && next.active) await topUpSeries(tx, next, timeZone, now);
      return next;
    });
  }

  /**
   * Edits the template and brings the open, today-or-later occurrences in line (#63),
   * **in place** (comment on #407): a soft-deleted occurrence keeps its date slot, so
   * delete + regenerate would block exactly the dates it wants back.
   *
   * - date still in the rule → same row, updated (title, notes, priority, time); subtasks
   *   and labels only when the template's subtasks/labels changed. An open tombstone on
   *   such a date is restored and reset to the template ("editing a series resets its
   *   upcoming occurrences").
   * - date no longer in the rule → soft-deleted
   * - new dates → inserted by `topUpSeries` (only while the series is active)
   *
   * Done, skipped and past occurrences are history and never touched.
   */
  async function updateTaskSeriesAndRegenerate(
    id: string,
    patch: TaskSeriesPatch,
    now: Date = new Date(),
  ): Promise<TaskSeries> {
    return db.transaction(async (tx) => {
      const timeZone = await requireTimeZone(tx);
      await lockUserScope(tx, "series", userId);
      const { current, next } = await writePatch(tx, id, patch);
      const templateChanged = !sameList(current.subtaskTemplate, next.subtaskTemplate);
      const labelsChanged = !sameList(current.labelIds, next.labelIds);

      const planned = new Map(
        planOccurrences(next, timeZone, now).map((o) => [o.occurrenceDate, o.dueDate]),
      );
      // Includes soft-deleted rows: those are the tombstones that may come back.
      const upcoming = await tx
        .select({ id: tasks.id, occurrenceDate: tasks.occurrenceDate, deletedAt: tasks.deletedAt })
        .from(tasks)
        .where(upcomingOpen(id, startOfLocalDay(timeZone, now)));

      const stamp = new Date();
      const resetSubtasks: string[] = [];
      const resetLabels: string[] = [];
      for (const occurrence of upcoming) {
        const dueDate = occurrence.occurrenceDate && planned.get(occurrence.occurrenceDate);
        if (!dueDate) {
          if (occurrence.deletedAt === null) {
            await tx
              .update(tasks)
              .set({ deletedAt: stamp, updatedAt: stamp })
              .where(eq(tasks.id, occurrence.id));
          }
          continue;
        }
        const restored = occurrence.deletedAt !== null;
        await tx
          .update(tasks)
          .set({
            title: next.title,
            notes: next.notes ?? null,
            priority: next.priority,
            allDay: next.allDay,
            dueDate: new Date(dueDate),
            deletedAt: null,
            updatedAt: stamp,
          })
          .where(eq(tasks.id, occurrence.id));
        if (templateChanged || restored) resetSubtasks.push(occurrence.id);
        if (labelsChanged || restored) resetLabels.push(occurrence.id);
      }

      if (resetSubtasks.length > 0) {
        await tx.delete(subtasks).where(inArray(subtasks.taskId, resetSubtasks));
        if (next.subtaskTemplate.length > 0) {
          const keys = keysBetween(null, null, next.subtaskTemplate.length);
          await tx.insert(subtasks).values(
            resetSubtasks.flatMap((taskId) =>
              next.subtaskTemplate.map((template, index) => ({
                id: crypto.randomUUID(),
                taskId,
                userId,
                title: template.title,
                done: false,
                sortOrder: keys[index],
              })),
            ),
          );
        }
      }
      if (resetLabels.length > 0) {
        await tx.delete(taskLabels).where(inArray(taskLabels.taskId, resetLabels));
        if (next.labelIds.length > 0) {
          await tx
            .insert(taskLabels)
            .values(
              resetLabels.flatMap((taskId) =>
                next.labelIds.map((labelId) => ({ taskId, labelId })),
              ),
            );
        }
      }

      await topUpSeries(tx, next, timeZone, now);
      return next;
    });
  }

  /** Counts for the delete dialog (#148); deleted occurrences don't count. */
  async function countSeriesOccurrences(
    id: string,
    now: Date = new Date(),
  ): Promise<{ upcoming: number; total: number }> {
    if (!isUuid(id)) return { upcoming: 0, total: 0 };
    const timeZone = await requireTimeZone(db);
    const notDeleted = isNull(tasks.deletedAt);
    const [{ upcoming }] = await db
      .select({ upcoming: count() })
      .from(tasks)
      .where(and(upcomingOpen(id, startOfLocalDay(timeZone, now)), notDeleted));
    const [{ total }] = await db
      .select({ total: count() })
      .from(tasks)
      .where(and(ownOccurrences(id), notDeleted));
    return { upcoming, total };
  }

  async function softDeleteSeries(tx: Database, id: string, stamp: Date) {
    if (!isUuid(id)) throw new NotFoundError("series", id);
    const deleted = await tx
      .update(taskSeries)
      .set({ deletedAt: stamp, updatedAt: stamp })
      .where(and(live, eq(taskSeries.id, id)))
      .returning({ id: taskSeries.id });
    if (deleted.length === 0) throw new NotFoundError("series", id);
  }

  /** Every occurrence becomes a standalone task (`occurrence_date` stays as history). */
  async function detachOccurrences(tx: Database, id: string, stamp: Date) {
    await tx.update(tasks).set({ seriesId: null, updatedAt: stamp }).where(ownOccurrences(id));
  }

  /** Deletes the template; every occurrence is kept as a standalone task (#148). */
  async function deleteTaskSeriesKeepingTasks(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      const stamp = new Date();
      await softDeleteSeries(tx, id, stamp);
      await detachOccurrences(tx, id, stamp);
    });
  }

  /** Deletes the template and its upcoming open occurrences; the rest stays as history. */
  async function deleteTaskSeriesAndUpcoming(id: string, now: Date = new Date()): Promise<void> {
    await db.transaction(async (tx) => {
      const timeZone = await requireTimeZone(tx);
      const stamp = new Date();
      await softDeleteSeries(tx, id, stamp);
      await tx
        .update(tasks)
        .set({ deletedAt: stamp, updatedAt: stamp })
        .where(and(upcomingOpen(id, startOfLocalDay(timeZone, now)), isNull(tasks.deletedAt)));
      await detachOccurrences(tx, id, stamp);
    });
  }

  /** Deletes the template and every occurrence, history included (#148). */
  async function deleteTaskSeriesAndOccurrences(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      const stamp = new Date();
      await softDeleteSeries(tx, id, stamp);
      await tx
        .update(tasks)
        .set({ deletedAt: stamp, updatedAt: stamp })
        .where(and(ownOccurrences(id), isNull(tasks.deletedAt)));
    });
  }

  return {
    listTaskSeries,
    getTaskSeries,
    createTaskSeries,
    createTaskSeriesWithOccurrences,
    updateTaskSeries,
    updateTaskSeriesAndRegenerate,
    countSeriesOccurrences,
    deleteTaskSeriesKeepingTasks,
    deleteTaskSeriesAndUpcoming,
    deleteTaskSeriesAndOccurrences,
  };
}
