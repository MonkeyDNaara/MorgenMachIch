import type { Priority } from "@/lib/types";

/**
 * Colors for the priority dot — currently used on the week-ahead strip
 * only (#130); the calendar view will reuse it once built, per the
 * plan agreed there. Deliberately not touching the theme's reserved
 * secondary/accent/info/success/warning slots (see app/globals.css —
 * those are saved for the Priority epic's own design pass on the main
 * task card, issue #7). Instead this reuses colors already vetted for
 * this dark theme: Green and Yellow-green from the label palette, and
 * the same red already used for the overdue border, so "high priority"
 * and "overdue" share one urgency signal instead of two reds competing.
 */
export const PRIORITY_DOT_COLORS: Record<Priority, string | null> = {
  none: null,
  low: "#7cc36c",
  medium: "#c3af32",
  high: "#e2604a",
};
