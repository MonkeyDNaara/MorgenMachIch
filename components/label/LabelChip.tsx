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
 * Colors are per-label runtime values from the fixed palette
 * (lib/constants/labelColors), so they're applied as inline styles
 * rather than Tailwind classes — hex + a 2-digit alpha suffix for the
 * tint/border opacity.
 */
export default function LabelChip({ name, color, size = "md", className = "" }: LabelChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${SIZE_CLASSES[size]} ${className}`}
      style={{
        backgroundColor: `${color}29`, // ~16% opacity
        color,
        border: `1px solid ${color}66`, // ~40% opacity
      }}
    >
      {name}
    </span>
  );
}
