import type { Priority } from "@/lib/types";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import { tintChipStyle } from "@/lib/ui/colorChip";

const PRIORITY_LABELS: Record<Priority, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
};

type PriorityChipProps = {
  priority: Priority;
  className?: string;
};

/**
 * Pill for a single priority level — same soft-tint styling as
 * LabelChip (shared via lib/ui/colorChip), driven by the priority's own
 * color (lib/constants/priorityColors) instead of a label's. "None" has
 * no color, so it renders as a plain neutral chip instead of a tint
 * (#138).
 */
export default function PriorityChip({ priority, className = "" }: PriorityChipProps) {
  const color = PRIORITY_DOT_COLORS[priority];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
        color === null ? "bg-base-300 text-base-content/60" : ""
      } ${className}`}
      style={color !== null ? tintChipStyle(color) : undefined}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
