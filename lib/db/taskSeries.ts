import { db } from "@/lib/db/db";
import { TaskSeriesSchema, type Task, type TaskSeries, type NewTaskSeries } from "@/lib/types";
import { generateOccurrences } from "@/lib/db/occurrences";

export type TaskSeriesPatch = Partial<Omit<TaskSeries, "id" | "createdAt" | "updatedAt">>;

function parseRowOrWarn(row: unknown): TaskSeries | undefined {
  const result = TaskSeriesSchema.safeParse(row);
  if (!result.success) {
    console.warn("Skipping invalid task series row", row, result.error);
    return undefined;
  }
  return result.data;
}

// "series" reads the same in singular and plural, so these are named
// list/get (like getTasks/getTask) rather than a confusing getTaskSeries
// for both — listTaskSeries() returns all, getTaskSeries(id) returns one.
export async function listTaskSeries(): Promise<TaskSeries[]> {
  const rows = await db.taskSeries.toArray();
  return rows.map(parseRowOrWarn).filter((series): series is TaskSeries => series !== undefined);
}

export async function getTaskSeries(id: string): Promise<TaskSeries | undefined> {
  const row = await db.taskSeries.get(id);
  return row ? parseRowOrWarn(row) : undefined;
}

export async function createTaskSeries(input: NewTaskSeries): Promise<TaskSeries> {
  const now = new Date().toISOString();
  const series: TaskSeries = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const validated = TaskSeriesSchema.parse(series);
  await db.taskSeries.add(validated);
  return validated;
}

export async function updateTaskSeries(id: string, patch: TaskSeriesPatch): Promise<TaskSeries> {
  const existing = await db.taskSeries.get(id);
  if (!existing) throw new Error(`Task series not found: ${id}`);
  const updated: TaskSeries = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  const validated = TaskSeriesSchema.parse(updated);
  await db.taskSeries.put(validated);
  return validated;
}

function startOfDayMs(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** An occurrence that is still `open` and due today-or-later — the set a
 * series edit regenerates (#63) and a series delete can remove (#148).
 * Completed, skipped and already-overdue rows are history and stay. */
function isUpcomingOpen(task: Task, startOfToday: number): boolean {
  return task.status === "open" && task.dueDate !== null && new Date(task.dueDate).getTime() >= startOfToday;
}

/**
 * Edits a series' template AND brings its already-generated future
 * occurrences in line with it (#63). generateOccurrences() only ever
 * adds missing dates — it never touches a Task row that already exists
 * for a date — so a template edit alone would leave stale rows behind
 * indefinitely. Instead: update the template, delete this series' rows
 * that are still `open` and due today-or-later, then let
 * generateOccurrences() refill them from the new template/rule.
 *
 * Completed and skipped occurrences are never deleted, so history and
 * per-occurrence skip decisions (#61) survive an edit. Trade-off: an
 * open occurrence due today-or-later is replaced wholesale, so any
 * subtasks already checked off on it start unchecked again.
 *
 * A paused series (active: false) is skipped by generateOccurrences(),
 * so its removed rows come back on resume rather than immediately.
 */
export async function updateTaskSeriesAndRegenerate(
  id: string,
  patch: TaskSeriesPatch,
  now: Date = new Date(),
): Promise<TaskSeries> {
  const startOfToday = startOfDayMs(now);

  const updated = await db.transaction("rw", db.tasks, db.taskSeries, async () => {
    const result = await updateTaskSeries(id, patch);
    const occurrences = await db.tasks.where("seriesId").equals(id).toArray();
    const staleIds = occurrences.filter((task) => isUpcomingOpen(task, startOfToday)).map((task) => task.id);
    await db.tasks.bulkDelete(staleIds);
    return result;
  });

  await generateOccurrences(now);
  return updated;
}

/** How many occurrences a series delete would touch, for the confirm
 * step's counts (#148): `upcoming` are the open today-or-later rows that
 * "delete series + upcoming tasks" removes; `total` is every occurrence
 * that would otherwise be kept as a standalone task. */
export async function countSeriesOccurrences(
  id: string,
  now: Date = new Date(),
): Promise<{ upcoming: number; total: number }> {
  const startOfToday = startOfDayMs(now);
  const occurrences = await db.tasks.where("seriesId").equals(id).toArray();
  return {
    upcoming: occurrences.filter((task) => isUpcomingOpen(task, startOfToday)).length,
    total: occurrences.length,
  };
}

/** Detaches every remaining occurrence (seriesId -> null) so it becomes a
 * normal standalone task. Without this they'd be hidden orphans: /tasks
 * excludes every task that still carries a seriesId from its Tasks column. */
async function detachOccurrences(id: string): Promise<void> {
  await db.tasks.where("seriesId").equals(id).modify({ seriesId: null, updatedAt: new Date().toISOString() });
}

/** Deletes the series template only; every existing occurrence (open,
 * done, skipped) is kept as a standalone task (#148). */
export async function deleteTaskSeriesKeepingTasks(id: string): Promise<void> {
  await db.transaction("rw", db.tasks, db.taskSeries, async () => {
    await detachOccurrences(id);
    await db.taskSeries.delete(id);
  });
}

/** Deletes the series template and its upcoming open occurrences (due
 * today-or-later). Completed, skipped and already-overdue occurrences are
 * kept as standalone history (#148). */
export async function deleteTaskSeriesAndUpcoming(id: string, now: Date = new Date()): Promise<void> {
  const startOfToday = startOfDayMs(now);
  await db.transaction("rw", db.tasks, db.taskSeries, async () => {
    const occurrences = await db.tasks.where("seriesId").equals(id).toArray();
    await db.tasks.bulkDelete(occurrences.filter((task) => isUpcomingOpen(task, startOfToday)).map((task) => task.id));
    await detachOccurrences(id);
    await db.taskSeries.delete(id);
  });
}

/** Deletes the series template AND every occurrence generated from it,
 * including completed/skipped history (#148). Irreversible; the UI puts it
 * behind an explicit third choice. */
export async function deleteTaskSeriesAndOccurrences(id: string): Promise<void> {
  await db.transaction("rw", db.tasks, db.taskSeries, async () => {
    await db.tasks.where("seriesId").equals(id).delete();
    await db.taskSeries.delete(id);
  });
}
