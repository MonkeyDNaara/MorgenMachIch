"use client";

import type { Label } from "@/lib/types";
import LabelChip from "@/components/label/LabelChip";

type LabelFilterBarProps = {
  labels: Label[];
  activeLabelIds: string[];
  onToggle: (labelId: string) => void;
  onClear: () => void;
};

/**
 * Row of toggle chips for filtering a task list by label — same
 * dimmed/full-opacity toggle treatment as the drawer's label picker
 * (TaskDrawerPanel), so the interaction reads the same everywhere.
 * Multiple labels can be active at once (OR match — see
 * lib/utils/filterTasksByLabels). Renders nothing if there are no
 * labels yet, so a fresh install shows no empty filter bar.
 */
export default function LabelFilterBar({
  labels,
  activeLabelIds,
  onToggle,
  onClear,
}: LabelFilterBarProps) {
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-6 py-3">
      {labels.map((label) => {
        const active = activeLabelIds.includes(label.id);
        return (
          <button
            key={label.id}
            type="button"
            onClick={() => onToggle(label.id)}
            aria-pressed={active}
            className={`cursor-pointer rounded-full outline-none! transition-opacity ${
              active ? "opacity-100" : "opacity-40 hover:opacity-70"
            }`}
          >
            <LabelChip name={label.name} color={label.color} size="sm" />
          </button>
        );
      })}
      {activeLabelIds.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="btn btn-ghost btn-xs ml-auto cursor-pointer text-base-content/60"
        >
          Clear
        </button>
      )}
    </div>
  );
}
