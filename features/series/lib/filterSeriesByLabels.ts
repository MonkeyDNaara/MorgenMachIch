import type { TaskSeries } from "@/lib/types";

/**
 * Filters series by label (OR match) — same semantics as
 * filterTasksByLabels, reused for the Recurring column on /tasks (#62)
 * so the shared label filter bar applies to both columns.
 */
export function filterSeriesByLabels(series: TaskSeries[], labelIds: string[]): TaskSeries[] {
  if (labelIds.length === 0) return series;
  return series.filter((s) => s.labelIds.some((id) => labelIds.includes(id)));
}
