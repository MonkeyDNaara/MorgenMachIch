"use client";

import type { Priority } from "@/lib/types";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import { useRadioGroupKeys } from "@/hooks/useRadioGroupKeys";

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
 * carries its priority dot. Keyboard: one tab stop, arrow keys and
 * Home/End change the priority (#272).
 */
export default function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const radios = useRadioGroupKeys({
    count: PRIORITY_LEVELS.length,
    selectedIndex: PRIORITY_LEVELS.findIndex((level) => level.value === value),
    onSelect: (index) => onChange(PRIORITY_LEVELS[index].value),
  });

  return (
    <div
      role="radiogroup"
      aria-label="Priority"
      {...radios.groupProps}
      className="grid grid-cols-4 gap-0.5 rounded-xl surface-sunken p-1"
    >
      {PRIORITY_LEVELS.map((level, index) => {
        const selected = value === level.value;
        const color = PRIORITY_DOT_COLORS[level.value];
        return (
          <button
            key={level.value}
            {...radios.itemProps(index)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(level.value)}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm outline-none! transition-colors focus-visible:shadow-focus ${
              selected
                ? "bg-base-300 text-base-content shadow-raised-sm"
                : "text-muted hover:text-base-content"
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
