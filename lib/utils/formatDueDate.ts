/**
 * Formats the time portion of a stored dueDate ISO string, using local
 * time (not UTC) — consistent with how dueDate is built in the first
 * place (see buildDueDateIso in this same folder). Split out of
 * formatDueDate so the week-ahead strip's per-task time badge (#130)
 * reuses this instead of duplicating the toLocaleTimeString call.
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Formats a stored dueDate ISO string for display on a task card, using
 * local time parts (not UTC).
 *
 * Examples: "Sep 10" for an all-day task, "Sep 10, 14:00" for a timed one.
 */
export function formatDueDate(iso: string, allDay: boolean): string {
  const datePart = new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (allDay) return datePart;

  return `${datePart}, ${formatTime(iso)}`;
}

/** True if the given ISO dueDate is strictly before the current moment. */
export function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
