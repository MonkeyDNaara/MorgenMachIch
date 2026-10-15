/**
 * Filters tasks by label — a task matches if it has *any* of the
 * selected labels (OR, not AND), the simpler and more common default
 * for tag filters. An empty selection returns the list unchanged
 * (no filter active) rather than an empty array.
 *
 * Generic over anything with `labelIds` (#171) so the calendar can run
 * the same filter over real tasks and projected ghost occurrences.
 */
export function filterTasksByLabels<T extends { labelIds: string[] }>(tasks: T[], labelIds: string[]): T[] {
  if (labelIds.length === 0) return tasks;
  return tasks.filter((task) => task.labelIds.some((id) => labelIds.includes(id)));
}
