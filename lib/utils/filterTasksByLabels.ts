import type { Task } from "@/lib/types";

/**
 * Filters tasks by label — a task matches if it has *any* of the
 * selected labels (OR, not AND), the simpler and more common default
 * for tag filters. An empty selection returns the list unchanged
 * (no filter active) rather than an empty array.
 */
export function filterTasksByLabels(tasks: Task[], labelIds: string[]): Task[] {
  if (labelIds.length === 0) return tasks;
  return tasks.filter((task) => task.labelIds.some((id) => labelIds.includes(id)));
}
