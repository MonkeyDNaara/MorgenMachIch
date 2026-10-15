import type { CSSProperties } from "react";

/**
 * Soft-tint chip styling: a low-opacity tint of `color` as the
 * background, full-saturation `color` as text/border. Colors here are
 * runtime values (label hex colors, or theme variables such as
 * `var(--color-accent)` for priorities and dates), so this returns
 * inline styles instead of Tailwind classes. `color-mix` makes the
 * tint work for both hex and CSS variables (#231).
 *
 * Extracted out of LabelChip (#138) so other chips reuse the exact
 * same tint math instead of duplicating it.
 *
 * Text goes through `inkColor` (#265) so pastel label colors stay readable
 * in the light theme.
 */
export function tintChipStyle(color: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
    color: inkColor(color),
    border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
  };
}

/**
 * Color for text drawn in a runtime color (#265). Label swatches are stored
 * hex values tuned for dark surfaces, so they are mixed with the theme's text
 * color by `--mm-chip-ink` (100 % in the dark theme = unchanged, 55 % in the
 * light theme). Theme variables (`var(--color-accent)`, priority colors) are
 * already tuned per theme and pass through unchanged.
 */
export function inkColor(color: string): string {
  if (color.startsWith("var(")) return color;
  return `color-mix(in oklab, ${color} var(--mm-chip-ink), var(--color-base-content))`;
}
