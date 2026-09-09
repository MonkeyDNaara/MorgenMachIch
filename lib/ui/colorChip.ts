import type { CSSProperties } from "react";

/**
 * Soft-tint chip styling: a low-opacity tint of `color` as the
 * background, full-saturation `color` as text/border. Colors here are
 * runtime hex values (the label palette, the priority colors) rather
 * than fixed design tokens, so this returns inline styles instead of
 * Tailwind classes.
 *
 * Extracted out of LabelChip (#138) so PriorityChip reuses the exact
 * same tint math instead of duplicating it.
 */
export function tintChipStyle(color: string): CSSProperties {
  return {
    backgroundColor: `${color}29`, // ~16% opacity
    color,
    border: `1px solid ${color}66`, // ~40% opacity
  };
}
