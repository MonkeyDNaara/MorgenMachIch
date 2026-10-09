"use client";

import { useId, useRef, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import type { Label } from "@/lib/types";
import type { PriorityFilter } from "@/lib/utils/filterTasksByPriority";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import { useDismiss } from "@/lib/ui/useDismiss";
import LabelChip from "@/components/label/LabelChip";

const PRIORITY_OPTIONS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "Any priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
];

/** At most this many active label chips are shown inside the button. */
const MAX_BUTTON_CHIPS = 2;

type FilterPopoverProps = {
  labels: Label[];
  activeLabelIds: string[];
  onToggleLabel: (labelId: string) => void;
  priority: PriorityFilter;
  onPriorityChange: (priority: PriorityFilter) => void;
  /** Resets labels and priority together. */
  onClear: () => void;
};

const rowClasses =
  "flex w-full cursor-pointer items-center gap-3 rounded-field px-2.5 py-2 text-left text-sm outline-none! transition-colors hover:bg-line focus-visible:bg-line";

/**
 * Label + priority filter behind one raised "Filter" button (#236),
 * replacing the full-width label pill row and the priority select on
 * /today, /tasks and /calendar. Active filters show as chips inside the
 * button. Labels are multi-select (OR), priority single-select — the
 * same semantics as before, only the controls moved.
 */
export default function FilterPopover({
  labels,
  activeLabelIds,
  onToggleLabel,
  priority,
  onPriorityChange,
  onClear,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useDismiss(open, () => setOpen(false), [buttonRef, panelRef], buttonRef);

  const activeLabels = labels.filter((label) => activeLabelIds.includes(label.id));
  const activeCount = activeLabels.length + (priority === "all" ? 0 : 1);
  const priorityLabel = PRIORITY_OPTIONS.find((option) => option.value === priority)?.label;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={activeCount > 0 ? `Filter, ${activeCount} active` : "Filter"}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-field bg-base-300 px-3 text-sm text-base-content/80 shadow-raised-sm outline-none! transition-colors hover:text-base-content focus-visible:shadow-focus"
      >
        <SlidersHorizontal size={14} strokeWidth={2} />
        Filter
        {activeLabels.slice(0, MAX_BUTTON_CHIPS).map((label) => (
          <LabelChip key={label.id} name={label.name} color={label.color} size="sm" />
        ))}
        {activeLabels.length > MAX_BUTTON_CHIPS && (
          <span className="font-mono text-meta text-base-content/60">
            +{activeLabels.length - MAX_BUTTON_CHIPS}
          </span>
        )}
        {priority !== "all" && (
          <span className="font-mono text-meta text-base-content/60">!{priorityLabel}</span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label="Filters"
          className="absolute top-full right-0 z-30 mt-2 flex w-60 flex-col gap-1 rounded-box border border-line-strong bg-base-300 p-2 shadow-overlay"
        >
          {labels.length > 0 && (
            <>
              <p className="px-2.5 pt-1 pb-1 font-mono text-eyebrow text-base-content/50 uppercase">
                Labels
              </p>
              {labels.map((label) => {
                const active = activeLabelIds.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => onToggleLabel(label.id)}
                    aria-pressed={active}
                    className={rowClasses}
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 truncate">{label.name}</span>
                    {active && <Check size={14} className="text-accent" />}
                  </button>
                );
              })}
              <div className="my-1 border-t border-line" />
            </>
          )}
          <p className="px-2.5 pt-1 pb-1 font-mono text-eyebrow text-base-content/50 uppercase">
            Priority
          </p>
          <div role="radiogroup" aria-label="Priority" className="flex flex-col gap-0.5">
            {PRIORITY_OPTIONS.map((option) => {
              const active = priority === option.value;
              const color = option.value === "all" ? null : PRIORITY_DOT_COLORS[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onPriorityChange(option.value)}
                  className={rowClasses}
                >
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-full ${color ? "" : "border border-base-content/30"}`}
                    style={color ? { backgroundColor: color } : undefined}
                  />
                  <span className="flex-1">{option.label}</span>
                  {active && <Check size={14} className="text-accent" />}
                </button>
              );
            })}
          </div>
          {activeCount > 0 && (
            <>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                onClick={onClear}
                className={`${rowClasses} text-base-content/60`}
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
