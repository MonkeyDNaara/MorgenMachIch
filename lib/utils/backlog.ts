import type { Priority, Task } from "@/lib/types";

/**
 * A backlog task is an open, standalone task with no due date (#182):
 * "do it whenever there's time". No extra flag or status — `dueDate:
 * null` already means "no date", so giving a task a date (planning it)
 * moves it out of the backlog and clearing the date sends it back.
 *
 * Series occurrences always carry a due date, but `seriesId === null` is
 * checked anyway so the rule never depends on that. Done/skipped
 * dateless tasks are history, not backlog, and stay in the normal list.
 */
export function isBacklogTask(task: Task): boolean {
  return task.status === "open" && task.dueDate === null && task.seriesId === null;
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };

/**
 * Backlog order: high priority first, then oldest first within a
 * priority so nothing rots at the bottom (#182). ISO strings compare
 * chronologically, so `localeCompare` on `createdAt` is enough.
 */
export function sortBacklogTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

const MS_PER_DAY = 86_400_000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * How long ago a task was created, for the backlog's age marker (#182):
 * "today", "3d ago", "5w ago", "4mo ago", "2y ago". Counts local
 * calendar days (not 24-hour blocks) so a task created late last night
 * reads "1d ago" this morning, and never goes negative.
 */
export function formatTaskAge(createdAtIso: string, now: Date = new Date()): string {
  const days = Math.max(
    0,
    Math.round(
      (startOfDay(now).getTime() - startOfDay(new Date(createdAtIso)).getTime()) / MS_PER_DAY,
    ),
  );
  if (days === 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
