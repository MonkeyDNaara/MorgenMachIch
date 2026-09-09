"use client";

import type { Priority } from "@/lib/types";
import PriorityChip from "@/components/task/PriorityChip";

const PRIORITY_LEVELS: Priority[] = ["none", "low", "medium", "high"];

type PrioritySelectorProps = {
  value: Priority;
  onChange: (priority: Priority) => void;
};

/**
 * Single-select priority chip row for the task drawer. Same
 * toggle-opacity interaction as the label picker (full opacity =
 * selected, dimmed = not) rather than a new selector style — the only
 * difference is exactly one is always selected here instead of
 * zero-or-more (#138).
 */
export default function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRIORITY_LEVELS.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            aria-pressed={selected}
            className={`cursor-pointer rounded-full outline-none! transition-opacity ${
              selected ? "opacity-100" : "opacity-40 hover:opacity-70"
            }`}
          >
            <PriorityChip priority={level} />
          </button>
        );
      })}
    </div>
  );
}
