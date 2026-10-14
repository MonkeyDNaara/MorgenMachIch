import type { Task } from "@/lib/types";
import { parseDateOnly } from "@/lib/utils/parseDateOnly";
import { toLocalDateKey } from "@/lib/utils/planDateOptions";

/**
 * Rules and date math for moving a task to another day by drag & drop
 * (#74; reused by Coming up #356 and the Backlog tray #357). Pure, `now`
 * passed in, days built from local date parts so DST never shifts them.
 */

/**
 * Only open, non-recurring tasks move (same rule as "→ Morgen"): a moved
 * occurrence would be recreated on its old date by `generateOccurrences`,
 * and moving done/skipped tasks would rewrite their on-time history.
 */
export function canReschedule(task: Pick<Task, "status" | "seriesId">): boolean {
  return task.status === "open" && task.seriesId === null;
}

/** A day accepts drops from today on — like Plan for… (min = today). */
export function isDropDay(day: Date, now: Date): boolean {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return target.getTime() >= start.getTime();
}

/**
 * The due date after dropping on `day`: same time of day, new date. An
 * all-day task stays at local midnight.
 */
export function moveToDay(dueIso: string, allDay: boolean, day: Date): string {
  const due = new Date(dueIso);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    allDay ? 0 : due.getHours(),
    allDay ? 0 : due.getMinutes(),
  ).toISOString();
}

/** True when a due date already falls on `day` (a drop there changes nothing). */
export function isOnDay(dueIso: string, day: Date): boolean {
  return toLocalDateKey(new Date(dueIso)) === toLocalDateKey(day);
}

const DAY_PREFIX = "day:";
const TASK_PREFIX = "task:";

/** Droppable id of a day target ("day:2026-10-15"). */
export function dropDayId(day: Date): string {
  return DAY_PREFIX + toLocalDateKey(day);
}

/** The day behind a droppable id, or null for anything else. */
export function parseDropDayId(id: string | number): Date | null {
  const value = String(id);
  if (!value.startsWith(DAY_PREFIX)) return null;
  const key = value.slice(DAY_PREFIX.length);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? parseDateOnly(key) : null;
}

/** Draggable id of a task ("task:<id>"), distinct from sortable ids. */
export function dragTaskId(taskId: string): string {
  return TASK_PREFIX + taskId;
}

export function parseDragTaskId(id: string | number): string | null {
  const value = String(id);
  return value.startsWith(TASK_PREFIX) ? value.slice(TASK_PREFIX.length) : null;
}
