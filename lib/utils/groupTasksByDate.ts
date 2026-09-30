/** Local Y-M-D key (not UTC) — day-granularity identity for a Date,
 * used to bucket tasks by due date and to look them back up per grid
 * cell in the calendar month view (#145). */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Buckets items with a due date by local calendar day (tasks, or the
 * calendar's CalendarEntry view-model — anything with a `dueDate`), so the month
 * grid (up to ~42 cells) can look up each day's tasks in O(1) instead
 * of filtering the whole task list once per cell.
 */
export function groupTasksByDate<T extends { dueDate: string | null }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    if (item.dueDate === null) continue;
    const key = dateKey(new Date(item.dueDate));
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}
