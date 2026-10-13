import type { Priority, Task } from "@/lib/types";
import { compareOrderKeys, keyBetween, keysBetween } from "@/lib/utils/orderKey";

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

/** The Backlog order before manual order existed (#182): high priority
 * first, then oldest first within a priority so nothing rots at the
 * bottom. ISO strings compare chronologically, so `localeCompare` on
 * `createdAt` is enough. */
function compareByPriorityThenAge(a: Task, b: Task): number {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt)
  );
}

/**
 * Backlog order (#75): tasks with a manual order key (`sortOrder`) first,
 * by key; then the tasks without one by priority → oldest. Keys come from
 * `reorderBacklogTask`, which gives the whole Backlog keys on the first
 * drag, so the mixed case only lasts until then — and new tasks (created
 * without a key) land at the bottom. Equal keys (possible when a planned
 * task comes back) fall back to priority → oldest.
 */
export function sortBacklogTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.sortOrder !== null && b.sortOrder !== null) {
      return compareOrderKeys(a.sortOrder, b.sortOrder) || compareByPriorityThenAge(a, b);
    }
    if (a.sortOrder !== null) return -1;
    if (b.sortOrder !== null) return 1;
    return compareByPriorityThenAge(a, b);
  });
}

/**
 * New order keys for moving Backlog task `id` between `prevId` and
 * `nextId` (#75) — the tasks shown directly above and below the drop
 * position, null for the top/bottom of the visible list. With filters on,
 * these are the visible neighbours, so the task lands between them.
 *
 * If any task has no key yet, or two tasks share one (a planned task that
 * comes back keeps its old key), every task first gets a fresh key in its
 * current `sortBacklogTasks` order; otherwise only the moved task changes.
 * Returns the keys to write by task id. Throws if an id isn't in `backlog`
 * or a task is passed as its own neighbour.
 */
export function planBacklogReorder(
  backlog: Task[],
  id: string,
  prevId: string | null,
  nextId: string | null,
): Map<string, string> {
  const sorted = sortBacklogTasks(backlog);
  const updates = new Map<string, string>();
  const keyOf = new Map<string, string>();

  const strictlyOrdered = sorted.every((task, i) => {
    if (task.sortOrder === null) return false;
    const before = i > 0 ? sorted[i - 1].sortOrder : null;
    return before === null || before < task.sortOrder;
  });
  if (strictlyOrdered) {
    sorted.forEach((task) => keyOf.set(task.id, task.sortOrder as string));
  } else {
    const keys = keysBetween(null, null, sorted.length);
    sorted.forEach((task, i) => {
      keyOf.set(task.id, keys[i]);
      updates.set(task.id, keys[i]);
    });
  }

  if (!keyOf.has(id)) throw new Error(`Not a Backlog task: ${id}`);
  const neighbourKey = (taskId: string | null): string | null => {
    if (taskId === null) return null;
    if (taskId === id) throw new Error("A task can't be its own neighbour");
    const key = keyOf.get(taskId);
    if (key === undefined) throw new Error(`Not a Backlog task: ${taskId}`);
    return key;
  };

  updates.set(id, keyBetween(neighbourKey(prevId), neighbourKey(nextId)));
  return updates;
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
