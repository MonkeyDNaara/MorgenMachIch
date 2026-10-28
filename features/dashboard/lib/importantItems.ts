import type { Task } from "@/lib/types";

/**
 * When an Important task is due, relative to today:
 * - `overdue`: due on an earlier local day (`day` = that day's midnight)
 * - `time`: due today at a set time (`late` once that time has passed)
 * - `all-day`: due today without a time
 */
export type ImportantWhen =
  { type: "overdue"; day: Date } | { type: "time"; late: boolean } | { type: "all-day" };

/**
 * One line in the Important card (#424). A union so later sources plug in
 * without a rewrite: agent entries marked important (#427) become
 * `{ kind: "entry" }`, calendar appointments `{ kind: "event" }`.
 */
export type ImportantItem = { kind: "task"; task: Task; when: ImportantWhen };

const WHEN_RANK: Record<ImportantWhen["type"], number> = { overdue: 0, time: 1, "all-day": 2 };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function whenOf(task: Task & { dueDate: string }, now: Date): ImportantWhen | null {
  const due = new Date(task.dueDate);
  const today = startOfDay(now).getTime();
  const dueDay = startOfDay(due);
  if (dueDay.getTime() < today) return { type: "overdue", day: dueDay };
  if (dueDay.getTime() > today) return null;
  return task.allDay ? { type: "all-day" } : { type: "time", late: due < now };
}

/**
 * What must not slip today: open high-priority tasks due today or on an
 * earlier day. Earlier days first (oldest first), then today's timed tasks
 * by time, then today's all-day tasks. Pure, `now` passed in.
 */
export function importantItems(tasks: readonly Task[], now: Date): ImportantItem[] {
  const items: ImportantItem[] = [];
  for (const task of tasks) {
    if (task.status !== "open" || task.priority !== "high" || task.dueDate === null) continue;
    const when = whenOf({ ...task, dueDate: task.dueDate }, now);
    if (when) items.push({ kind: "task", task, when });
  }
  return items.sort(
    (a, b) =>
      WHEN_RANK[a.when.type] - WHEN_RANK[b.when.type] ||
      (a.task.dueDate ?? "").localeCompare(b.task.dueDate ?? "") ||
      a.task.title.localeCompare(b.task.title),
  );
}

/** Part of the collapsed briefing line, e.g. "2 important"; null when there is nothing. */
export function importantSummary(items: readonly ImportantItem[]): string | null {
  return items.length > 0 ? `${items.length} important` : null;
}
