import { APP_LOCALE } from "@/lib/constants/locale";

/**
 * Formats the time portion of a stored dueDate ISO string, using local
 * time (not UTC) — consistent with how dueDate is built in the first
 * place (see buildDueDateIso in this same folder). Split out of
 * formatDueDate so the week-ahead strip's per-task time badge (#130)
 * reuses this instead of duplicating the toLocaleTimeString call.
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(APP_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Formats a stored dueDate ISO string for display on a task card, using
 * local time parts (not UTC).
 *
 * Examples: "10 Oct" for an all-day task, "10 Oct, 14:00" for a timed one.
 */
export function formatDueDate(iso: string, allDay: boolean): string {
  const datePart = new Date(iso).toLocaleDateString(APP_LOCALE, { month: "short", day: "numeric" });
  if (allDay) return datePart;

  return `${datePart}, ${formatTime(iso)}`;
}

/**
 * True if a due date has passed. A timed task is overdue once its moment
 * is over; an all-day task (stored as local midnight) only from the next
 * local day on — before #237 an all-day task due today counted as
 * overdue from 00:00, which turned it red on its own day.
 */
export function isOverdue(iso: string, allDay = false, now: Date = new Date()): boolean {
  const due = new Date(iso);
  if (!allDay) return due.getTime() < now.getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due.getTime() < startOfToday.getTime();
}
