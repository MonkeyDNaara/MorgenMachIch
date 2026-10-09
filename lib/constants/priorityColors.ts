import type { Priority } from "@/lib/types";

/**
 * Priority colors as theme variables (#231): low = success, medium =
 * warning, high = error, so "high priority" and "overdue" share one
 * urgency signal and a light theme can retune them in one place
 * (app/globals.css). Used for dots, chips and quick-add tokens.
 */
export const PRIORITY_DOT_COLORS: Record<Priority, string | null> = {
  none: null,
  low: "var(--color-success)",
  medium: "var(--color-warning)",
  high: "var(--color-error)",
};
