import type { CSSProperties } from "react";

/**
 * Soft-tint chip styling: a low-opacity tint of `color` as the
 * background, full-saturation `color` as text/border. Colors here are
 * runtime values (label hex colors, or theme variables such as
 * `var(--color-accent)` for priorities and dates), so this returns
 * inline styles instead of Tailwind classes. `color-mix` makes the
 * tint work for both hex and CSS variables (#231).
 *
 * Extracted out of LabelChip (#138) so PriorityChip reuses the exact
 * same tint math instead of duplicating it.
 */
export function tintChipStyle(color: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
    color,
    border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
  };
}
