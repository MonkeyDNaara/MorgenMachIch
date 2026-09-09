import type { Priority, Task } from "@/lib/types";

export type PriorityFilter = "all" | Priority;

/**
 * Filters tasks by priority. Single-select ("all" | one option) rather
 * than multi-select like the label filter — a task only ever has one
 * priority, same reasoning as the status filter (#140).
 */
export function filterTasksByPriority(tasks: Task[], priority: PriorityFilter): Task[] {
  if (priority === "all") return tasks;
  return tasks.filter((task) => task.priority === priority);
}
