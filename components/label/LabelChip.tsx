import { tintChipStyle } from "@/lib/ui/colorChip";

type LabelChipProps = {
  name: string;
  color: string;
  /** "md" (default) for the labels page and the drawer picker; "sm" for
   * on-card display where space is tighter and several might show at once. */
  size?: "sm" | "md";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<LabelChipProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

/**
 * Soft-tint label pill: a low-opacity tint of the label's color as the
 * background, full-saturation color as text/border, no leading dot.
 * Locked after a side-by-side comparison against a solid-filled
 * alternative — reads calmer against the dark theme and doesn't compete
 * with the cyan primary. Shared by the labels page, the task drawer's
 * label picker, and task cards.
 *
 * The tint styling itself lives in lib/ui/colorChip.ts (tintChipStyle),
 * shared with PriorityChip (#138) since both are runtime hex colors
 * applied as inline styles rather than Tailwind classes.
 */
export default function LabelChip({ name, color, size = "md", className = "" }: LabelChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${SIZE_CLASSES[size]} ${className}`}
      style={tintChipStyle(color)}
    >
      {name}
    </span>
  );
}
