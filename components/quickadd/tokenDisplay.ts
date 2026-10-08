import type { Label } from "@/lib/types";
import type { QuickAddToken } from "@/lib/utils/parseQuickAdd";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import { formatQuickAddDue } from "@/lib/utils/formatQuickAddDue";

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

const PRIORITY_NAMES = { none: "None", low: "Low", medium: "Medium", high: "High" } as const;

/**
 * Human-readable value of a token for chips and previews: the formatted
 * due date ("Fri 9 Oct, 15:00"), the label's real name ("Deep work") or
 * the priority ("High"). Shared by QuickAddChips and the palette's Add
 * row (#204).
 */
export function tokenLabel(token: QuickAddToken, labels: Label[], now: Date): string {
  if (token.kind === "date") return formatQuickAddDue(token.dueDate, token.allDay, now);
  if (token.kind === "priority") return PRIORITY_NAMES[token.priority];
  return labels.find((label) => label.id === token.labelId)?.name ?? token.text;
}
