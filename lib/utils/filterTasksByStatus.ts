import type { Task, TaskStatus } from "@/lib/types";
import { isOverdue } from "@/lib/utils/formatDueDate";

/**
 * "overdue" isn't a real TaskStatus — it's derived (has a due date in
 * the past, isn't done), same check TaskCard already uses for its red
 * border. Included here as a filter option because it's genuinely
 * useful, even though it overlaps with "open" rather than being a
 * distinct status value.
 */
export type StatusFilter = "all" | TaskStatus | "overdue";

/**
 * Filters tasks by status. Single-select ("all" | one option) rather
 * than multi-select like the label filter — a task only ever has one
 * status, so "show me open and done" isn't a meaningful combination the
 * way "show me Work or Home labels" is.
 */
export function filterTasksByStatus(tasks: Task[], status: StatusFilter): Task[] {
  if (status === "all") return tasks;
  if (status === "overdue") {
    return tasks.filter(
      (task) => task.status !== "done" && task.dueDate !== null && isOverdue(task.dueDate),
    );
  }
  return tasks.filter((task) => task.status === status);
}
