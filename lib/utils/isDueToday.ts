import type { Task } from "@/lib/types";
import { isOverdue } from "@/lib/utils/formatDueDate";

/**
 * True if the given ISO datetime falls on the same local calendar date
 * as `target` — compares year/month/day via local Date getters (never
 * UTC), matching the rest of the app's date handling. Generalized out
 * of isDueToday so the week-ahead strip's per-day bucketing (#130)
 * reuses this instead of duplicating the comparison.
 */
export function isSameLocalDay(iso: string, target: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

/** True if the given ISO dueDate falls on today's local calendar date. */
export function isDueToday(iso: string): boolean {
  return isSameLocalDay(iso, new Date());
}

/**
 * A task belongs on /today if it's due today (any status — a done task
 * due today still shows, struck through) or overdue and not yet done. A
 * task that was overdue and got completed drops off rather than
 * lingering forever, matching how TaskCard already treats "overdue" as
 * "not done + past due" for its red border.
 */
export function isTodayOrOverdue(task: Task): boolean {
  if (task.dueDate === null) return false;
  if (isDueToday(task.dueDate)) return true;
  return task.status !== "done" && isOverdue(task.dueDate);
}
