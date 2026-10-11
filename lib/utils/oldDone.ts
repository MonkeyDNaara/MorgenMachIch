import type { Task } from "@/lib/types";

/** Done tasks finished more than this many calendar days ago are hidden on /tasks (#289). */
export const OLD_DONE_DAYS = 7;

/**
 * Local midnight `OLD_DONE_DAYS` calendar days before today. Built from
 * local date parts (not `now - 7 × 24 h`), so a DST change in between
 * never shifts the boundary by an hour.
 */
export function oldDoneCutoff(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - OLD_DONE_DAYS);
}

/**
 * A task counts as "old done" when it is done and was completed before
 * the cutoff: finished on Sun 4 Oct, it is still visible through Sun
 * 11 Oct and hidden from Mon 12 Oct. Done tasks without `completedAt`
 * (e.g. very old data) stay visible — nothing is hidden on a guess.
 * Pure, `now` passed in.
 */
export function isOldDone(task: Pick<Task, "status" | "completedAt">, now: Date): boolean {
  if (task.status !== "done" || task.completedAt === null) return false;
  return new Date(task.completedAt).getTime() < oldDoneCutoff(now).getTime();
}

/**
 * Splits an already-filtered list into what /tasks shows by default
 * (`recent`) and the old done tasks behind the "Show" row (`old`),
 * keeping the input order in both.
 */
export function splitOldDone<T extends Pick<Task, "status" | "completedAt">>(
  tasks: T[],
  now: Date,
): { recent: T[]; old: T[] } {
  const recent: T[] = [];
  const old: T[] = [];
  for (const task of tasks) (isOldDone(task, now) ? old : recent).push(task);
  return { recent, old };
}
