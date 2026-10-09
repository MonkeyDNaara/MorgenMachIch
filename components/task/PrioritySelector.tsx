"use client";

import type { Priority } from "@/lib/types";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";

const PRIORITY_LEVELS: { value: Priority; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

type PrioritySelectorProps = {
  value: Priority;
  onChange: (priority: Priority) => void;
};

/**
 * Single-select priority control for the task and series drawers. Since
 * #240 a sunken segmented control (same pattern as the status filter)
 * instead of a row of dimmed chips: exactly one value is always
 * selected, which a segmented control says more clearly. Each option
 * carries its priority dot.
 */
export default function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Priority"
      className="grid grid-cols-4 gap-0.5 rounded-xl surface-sunken p-1"
    >
      {PRIORITY_LEVELS.map((level) => {
        const selected = value === level.value;
        const color = PRIORITY_DOT_COLORS[level.value];
        return (
          <button
            key={level.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(level.value)}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm outline-none! transition-colors focus-visible:shadow-focus ${
              selected
                ? "bg-base-300 text-base-content shadow-raised-sm"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            {color && (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
            {level.label}
          </button>
        );
      })}
    </div>
  );
}
