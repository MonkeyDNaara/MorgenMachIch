import type { Label } from "@/lib/types";
import { ensureLabels } from "@/lib/db/labels";
import type { QuickAddResult } from "@/lib/utils/parseQuickAdd";

/**
 * Creates the labels a quick-add parse asked for (#283) and returns the
 * result with their ids added to `labelIds`, plus the newly created ones
 * (for the toast). Run before saving the task or series: if that save then
 * fails, the labels stay — harmless, a retry simply matches them.
 */
export async function withNewLabels(
  result: QuickAddResult,
): Promise<{ result: QuickAddResult; created: Label[] }> {
  if (result.newLabels.length === 0) return { result, created: [] };
  const { labels, created } = await ensureLabels(result.newLabels);
  const labelIds = [...result.labelIds];
  for (const label of labels) if (!labelIds.includes(label.id)) labelIds.push(label.id);
  return { result: { ...result, labelIds }, created };
}

/** Toast suffix: " · new label “Family”" / " · new labels “A”, “B”", or "". */
export function newLabelsNote(created: Label[]): string {
  if (created.length === 0) return "";
  const names = created.map((label) => `“${label.name}”`).join(", ");
  return ` · new label${created.length > 1 ? "s" : ""} ${names}`;
}
