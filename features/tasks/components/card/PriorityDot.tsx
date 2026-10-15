import type { Priority } from "@/lib/types";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";

type PriorityDotProps = {
  priority: Priority;
  className?: string;
};

/**
 * Small colored dot signaling task priority (#130) — see
 * lib/constants/priorityColors.ts for where it's used and why these
 * colors. Renders nothing for "none" so a task with no priority set
 * doesn't show an empty placeholder dot.
 */
export default function PriorityDot({ priority, className = "" }: PriorityDotProps) {
  const color = PRIORITY_DOT_COLORS[priority];
  if (color === null) return null;

  return (
    <span
      aria-hidden="true"
      className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}
