import type { Task } from "@/lib/types";
import { isSameLocalDay } from "@/lib/utils/isDueToday";

export type DayProgress = { done: number; total: number };

/**
 * Progress of one local calendar day for the /today header (#233): every
 * task due that day counts, skipped ones don't, and `done` is how many
 * of them are completed. Overdue tasks from earlier days are left out on
 * purpose, so finishing one never makes the total jump. Pure, `now`
 * passed in.
 */
export function dayProgress(tasks: Task[], now: Date): DayProgress {
  let done = 0;
  let total = 0;
  for (const task of tasks) {
    if (task.dueDate === null || task.status === "skipped") continue;
    if (!isSameLocalDay(task.dueDate, now)) continue;
    total += 1;
    if (task.status === "done") done += 1;
  }
  return { done, total };
}
