import "server-only";
import type { ZodType } from "zod";
import { keysBetween } from "@/lib/domain/orderKey";
import type { AppSettings, Label, Subtask, Task, TaskSeries } from "@/lib/types";
import type { appSettings, labels, subtasks, taskSeries, tasks } from "@/server/db/schema";

/**
 * Row ↔ API object mapping (#404). Rows and API objects differ on purpose (#307):
 * dates are `Date` vs ISO strings, `notes` is `null` vs missing, labels live in join
 * tables and subtasks in their own table. The Zod schemas in `lib/types` stay the
 * contract; these functions are the only place that knows both shapes.
 */

export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
export type SubtaskRow = typeof subtasks.$inferSelect;
export type SubtaskInsert = typeof subtasks.$inferInsert;
export type LabelRow = typeof labels.$inferSelect;
export type LabelInsert = typeof labels.$inferInsert;
export type SeriesRow = typeof taskSeries.$inferSelect;
export type SeriesInsert = typeof taskSeries.$inferInsert;
export type SettingsRow = typeof appSettings.$inferSelect;
export type SettingsInsert = typeof appSettings.$inferInsert;

const iso = (date: Date) => date.toISOString();
const isoOrNull = (date: Date | null) => (date ? date.toISOString() : null);
const dateOrNull = (value: string | null) => (value ? new Date(value) : null);
/** `notes` is optional in the API and nullable in the database. */
const withNotes = <T extends object>(object: T, notes: string | null) =>
  notes === null ? object : { ...object, notes };

/* ── Tasks + subtasks ── */

export function rowToTask(row: TaskRow, labelIds: string[], subtaskRows: SubtaskRow[]): Task {
  const subtasks: Subtask[] = [...subtaskRows]
    // Byte-wise like the database's COLLATE "C" (never localeCompare).
    .sort((a, b) => (a.sortOrder < b.sortOrder ? -1 : a.sortOrder > b.sortOrder ? 1 : 0))
    .map(({ id, title, done }) => ({ id, title, done }));
  return withNotes(
    {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      dueDate: isoOrNull(row.dueDate),
      allDay: row.allDay,
      labelIds,
      subtasks,
      seriesId: row.seriesId,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
      completedAt: isoOrNull(row.completedAt),
      sortOrder: row.sortOrder,
    },
    row.notes,
  );
}

/**
 * The `tasks` row for a Task. `occurrenceDate` (the local day of a series occurrence)
 * comes from the caller, because only it knows the user's time zone (#312).
 */
export function taskToRow(
  task: Task,
  owner: { userId: string; source: TaskInsert["source"] },
  occurrenceDate: string | null = null,
): TaskInsert {
  return {
    id: task.id,
    userId: owner.userId,
    seriesId: task.seriesId,
    title: task.title,
    notes: task.notes ?? null,
    status: task.status,
    priority: task.priority,
    dueDate: dateOrNull(task.dueDate),
    allDay: task.allDay,
    completedAt: dateOrNull(task.completedAt),
    occurrenceDate,
    sortOrder: task.sortOrder,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    source: owner.source,
  };
}

/** Subtask rows in list order: fresh fractional keys keep the order the array has. */
export function subtasksToRows(taskId: string, userId: string, list: Subtask[]): SubtaskInsert[] {
  const keys = keysBetween(null, null, list.length);
  return list.map((subtask, index) => ({
    id: subtask.id,
    taskId,
    userId,
    title: subtask.title,
    done: subtask.done,
    sortOrder: keys[index],
  }));
}

/* ── Labels ── */

export function rowToLabel(row: LabelRow): Label {
  return {
    id: row.id,
    name: row.name,
    color: row.color as Label["color"],
    createdAt: iso(row.createdAt),
  };
}

export function labelToRow(
  label: Label,
  owner: { userId: string; source: LabelInsert["source"] },
): LabelInsert {
  return {
    id: label.id,
    userId: owner.userId,
    name: label.name,
    color: label.color,
    createdAt: new Date(label.createdAt),
    source: owner.source,
  };
}

/* ── Series ── */

export function rowToSeries(row: SeriesRow, labelIds: string[]): TaskSeries {
  return withNotes(
    {
      id: row.id,
      title: row.title,
      priority: row.priority,
      labelIds,
      subtaskTemplate: row.subtaskTemplate,
      recurrence: row.recurrence,
      startDate: iso(row.startDate),
      allDay: row.allDay,
      active: row.active,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    },
    row.notes,
  );
}

export function seriesToRow(
  series: TaskSeries,
  owner: { userId: string; source: SeriesInsert["source"] },
): SeriesInsert {
  return {
    id: series.id,
    userId: owner.userId,
    title: series.title,
    notes: series.notes ?? null,
    priority: series.priority,
    recurrence: series.recurrence,
    startDate: new Date(series.startDate),
    allDay: series.allDay,
    active: series.active,
    subtaskTemplate: series.subtaskTemplate,
    createdAt: new Date(series.createdAt),
    updatedAt: new Date(series.updatedAt),
    source: owner.source,
  };
}

/* ── Settings ── */

/** One row per user replaces the old fixed id "app"; no row yet = defaults. */
export function rowToSettings(row: SettingsRow | undefined): AppSettings {
  if (!row) return { id: "app", statsSince: null };
  return { id: "app", statsSince: isoOrNull(row.statsSince), timeZone: row.timeZone };
}

/** The settings row; the caller makes sure `timeZone` is set (the column is `not null`). */
export function settingsToRow(
  settings: AppSettings & { timeZone: string },
  userId: string,
): SettingsInsert {
  return { userId, statsSince: dateOrNull(settings.statsSince), timeZone: settings.timeZone };
}

/* ── Reading ── */

/**
 * Validates mapped objects with their Zod schema and skips (with a warning) the ones
 * that fail — one corrupted row must not take down a whole list (same rule as `lib/db`).
 */
export function parseRows<T>(schema: ZodType<T>, entity: string, items: unknown[]): T[] {
  const valid: T[] = [];
  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) valid.push(result.data);
    else console.warn(`Skipping invalid ${entity} row`, item, result.error);
  }
  return valid;
}
