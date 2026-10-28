import type { Priority, Task } from "@/lib/types";
import { dayProgress } from "@/features/today/lib/dayProgress";
import { isSameLocalDay } from "@/features/tasks/lib/isDueToday";

export type YesterdayReview = {
  /** Local midnight of the day being reviewed. */
  day: Date;
  done: number;
  total: number;
  /** Still-open tasks that were due that day: high priority first, then by due time. */
  missed: Task[];
};

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };

/** Local midnight of the calendar day before `now` (DST-safe: built from date parts). */
export function previousLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
}

/**
 * How yesterday went (#423), for the dashboard's Yesterday card. Counts
 * exactly like the /today header (dayProgress): every task due that local
 * day, skipped ones left out, done = status done — also when it was
 * finished later, so the numbers match /tasks. A task moved to another day
 * no longer belongs to yesterday. Pure, `now` passed in.
 */
export function yesterdayReview(tasks: readonly Task[], now: Date): YesterdayReview {
  const day = previousLocalDay(now);
  const { done, total } = dayProgress([...tasks], day);
  const missed = tasks
    .filter(
      (task) =>
        task.status === "open" && task.dueDate !== null && isSameLocalDay(task.dueDate, day),
    )
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        (a.dueDate ?? "").localeCompare(b.dueDate ?? "") ||
        a.title.localeCompare(b.title),
    );
  return { day, done, total, missed };
}

/** Part of the collapsed briefing line, e.g. "yesterday 4/6"; null when nothing was due. */
export function yesterdaySummary(review: YesterdayReview): string | null {
  return review.total > 0 ? `yesterday ${review.done}/${review.total}` : null;
}
