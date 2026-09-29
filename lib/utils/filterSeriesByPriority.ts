import type { Priority, TaskSeries } from "@/lib/types";

export type PriorityFilter = "all" | Priority;

/**
 * Filters series by priority — same semantics as filterTasksByPriority,
 * reused for the Recurring column on /tasks (#62) so the shared
 * priority filter applies to both columns.
 */
export function filterSeriesByPriority(series: TaskSeries[], priority: PriorityFilter): TaskSeries[] {
  if (priority === "all") return series;
  return series.filter((s) => s.priority === priority);
}
