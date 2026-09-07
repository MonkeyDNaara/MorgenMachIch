import type { Task } from "@/lib/types";
import { isOverdue } from "@/lib/utils/formatDueDate";

/**
 * True if the given ISO dueDate falls on today's local calendar date —
 * compares year/month/day via local Date getters (never UTC), matching
 * the rest of the app's date handling (see formatDueDate.ts).
 */
export function isDueToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
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
