import type { Task, TaskStatus } from "@/lib/types";

export type StatusFilter = "all" | TaskStatus;

/**
 * Filters tasks by status. Single-select ("all" | one status) rather
 * than multi-select like the label filter — a task only ever has one
 * status, so "show me open and done" isn't a meaningful combination the
 * way "show me Work or Home labels" is.
 */
export function filterTasksByStatus(tasks: Task[], status: StatusFilter): Task[] {
  if (status === "all") return tasks;
  return tasks.filter((task) => task.status === status);
}
