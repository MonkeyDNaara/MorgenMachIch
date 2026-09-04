/**
 * Formats a stored dueDate ISO string for display on a task card, using
 * local time parts (not UTC) — consistent with how dueDate is built in
 * the first place (see buildDueDateIso in this same folder).
 *
 * Examples: "Sep 10" for an all-day task, "Sep 10, 14:00" for a timed one.
 */
export function formatDueDate(iso: string, allDay: boolean): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (allDay) return datePart;

  const timePart = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart}, ${timePart}`;
}

/** True if the given ISO dueDate is strictly before the current moment. */
export function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
