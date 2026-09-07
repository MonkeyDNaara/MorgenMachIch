type LabelChipProps = {
  name: string;
  color: string;
  className?: string;
};

/**
 * Soft-tint label pill: a low-opacity tint of the label's color as the
 * background, full-saturation color as text/border, no leading dot.
 * Locked after a side-by-side comparison against a solid-filled
 * alternative — reads calmer against the dark theme and doesn't compete
 * with the cyan primary. Shared by the labels page and (once #-tbd wires
 * it up) the task drawer's label picker and task cards.
 *
 * Colors are per-label runtime values from the fixed palette
 * (lib/constants/labelColors), so they're applied as inline styles
 * rather than Tailwind classes — hex + a 2-digit alpha suffix for the
 * tint/border opacity.
 */
export default function LabelChip({ name, color, className = "" }: LabelChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${className}`}
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
