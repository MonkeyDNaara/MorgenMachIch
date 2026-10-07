import type { Priority } from "@/lib/types";

export type PriorityFilter = "all" | Priority;

/**
 * Filters tasks by priority. Single-select ("all" | one option) rather
 * than multi-select like the label filter — a task only ever has one
 * priority, same reasoning as the status filter (#140). Generic over
 * anything with a `priority` (#171) so it also filters calendar ghosts.
 */
export function filterTasksByPriority<T extends { priority: Priority }>(tasks: T[], priority: PriorityFilter): T[] {
  if (priority === "all") return tasks;
  return tasks.filter((task) => task.priority === priority);
}
