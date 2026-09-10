import type { Task } from "@/lib/types";

/** Local Y-M-D key (not UTC) — day-granularity identity for a Date,
 * used to bucket tasks by due date and to look them back up per grid
 * cell in the calendar month view (#145). */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Buckets tasks with a due date by local calendar day, so the month
 * grid (up to ~42 cells) can look up each day's tasks in O(1) instead
 * of filtering the whole task list once per cell.
 */
export function groupTasksByDate(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.dueDate === null) continue;
    const key = dateKey(new Date(task.dueDate));
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(task);
    } else {
      map.set(key, [task]);
    }
  }
  return map;
}
