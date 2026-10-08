import type { Label } from "@/lib/types";
import type { QuickAddToken } from "@/lib/utils/parseQuickAdd";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";

/** The theme's cyan accent as a hex, so it works with tintChipStyle's alpha suffixes. */
export const DATE_TOKEN_COLOR = "#4dd1e0";

/**
 * One color per token, shared by the in-input highlight and the preview
 * chip so a token looks like the chip it becomes: dates in the accent
 * color, labels in their own color, priorities in their dot color.
 */
export function tokenColor(token: QuickAddToken, labels: Label[]): string {
  if (token.kind === "date") return DATE_TOKEN_COLOR;
  if (token.kind === "priority") return PRIORITY_DOT_COLORS[token.priority] ?? DATE_TOKEN_COLOR;
  return labels.find((label) => label.id === token.labelId)?.color ?? DATE_TOKEN_COLOR;
}
