import { db } from "@/lib/db/db";
import { TaskSeriesSchema, type TaskSeries, type NewTaskSeries } from "@/lib/types";

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

/** Deletes the series template only — generated Task rows are untouched.
 * Used for "delete just this occurrence" flows (the occurrence itself is
 * removed separately via deleteTask). */
export async function deleteTaskSeries(id: string): Promise<void> {
  await db.taskSeries.delete(id);
}

/** Deletes the series template AND every Task row generated from it.
 * Used for "delete the whole series" flows. Which of these two functions
 * to call is a UI decision (Recurring Tasks epic), not made here. */
export async function deleteTaskSeriesAndOccurrences(id: string): Promise<void> {
  await db.transaction("rw", db.tasks, db.taskSeries, async () => {
    await db.tasks.where("seriesId").equals(id).delete();
    await db.taskSeries.delete(id);
  });
}
