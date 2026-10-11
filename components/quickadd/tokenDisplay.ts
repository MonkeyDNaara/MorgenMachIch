import type { Label } from "@/lib/types";
import type { QuickAddToken } from "@/lib/utils/parseQuickAdd";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import { formatQuickAddDue } from "@/lib/utils/formatQuickAddDue";
import { formatRecurrenceRule } from "@/lib/utils/formatRecurrenceRule";
import { APP_LOCALE } from "@/lib/constants/locale";

/** The theme's accent; tintChipStyle mixes it with color-mix, so a CSS variable works. */
export const DATE_TOKEN_COLOR = "var(--color-accent)";

/**
 * One color per token, shared by the in-input highlight and the preview
 * chip so a token looks like the chip it becomes: dates in the accent
 * color, labels in their own color, priorities in their dot color.
 */
export function tokenColor(token: QuickAddToken, labels: Label[]): string {
  if (token.kind === "date" || token.kind === "recurrence") return DATE_TOKEN_COLOR;
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
  if (token.kind === "date") return dateTokenLabel(token, now);
  if (token.kind === "priority") return PRIORITY_NAMES[token.priority];
  // The end date has its own "until …" chip (#275), so the rule leaves it out.
  if (token.kind === "recurrence")
    return formatRecurrenceRule({ ...token.recurrence, endDate: null });
  return labels.find((label) => label.id === token.labelId)?.name ?? token.text;
}

const TIME = new Intl.DateTimeFormat(APP_LOCALE, { hour: "2-digit", minute: "2-digit" });

/** "Today" → "today", so it reads inside a sentence ("from today"). */
function lowerRelative(label: string): string {
  return /^(Today|Tomorrow)/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;
}

/**
 * A date token's chip text by role (#275): a due date as before ("Fri 9
 * Oct, 15:00"); next to a recurrence the start reads "at 18:00" (only a
 * time) or "from Tue 1 Dec", and the end "until Thu 31 Dec".
 */
function dateTokenLabel(token: QuickAddToken & { kind: "date" }, now: Date): string {
  if (token.role === "end")
    return `until ${lowerRelative(formatQuickAddDue(token.dueDate, true, now))}`;
  if (token.role === "start") {
    if (token.timeOnly) return `at ${TIME.format(new Date(token.dueDate))}`;
    return `from ${lowerRelative(formatQuickAddDue(token.dueDate, token.allDay, now))}`;
  }
  return formatQuickAddDue(token.dueDate, token.allDay, now);
}
