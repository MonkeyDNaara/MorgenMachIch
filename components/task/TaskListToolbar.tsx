"use client";

import type { ReactNode } from "react";
import { ArrowDownUp } from "lucide-react";
import type { StatusFilter } from "@/lib/utils/filterTasksByStatus";
import type { TaskSortBy } from "@/lib/utils/sortTasks";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "done", label: "Done" },
  // Skipped occurrences are hidden under "All" (added for #61) — this is
  // the only way to see them.
  { value: "skipped", label: "Skipped" },
];

const SORT_LABELS: Record<TaskSortBy, { short: string; long: string }> = {
  dueDate: { short: "due ↑", long: "due date, soonest first" },
  createdAt: { short: "newest", long: "created, newest first" },
};

type TaskListToolbarProps = {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  sortBy: TaskSortBy;
  onSortByChange: (sortBy: TaskSortBy) => void;
  /** The Filter popover, or nothing when the surrounding view owns the
   * label/priority filters itself (/calendar's day view, #171). */
  filter?: ReactNode;
  /** Width/padding classes so the toolbar lines up with the page's content column. */
  className?: string;
};

/**
 * One-row toolbar (#236): a sunken segmented control for the status
 * filter (a task has exactly one status, so it is single-select), then
 * the Filter popover for labels and priority and a compact sort toggle
 * (there are only two sort orders). On narrow screens the segmented
 * control scrolls sideways instead of clipping. Plain state owned by the
 * parent view, resets on reload.
 */
export default function TaskListToolbar({
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  filter,
  className = "",
}: TaskListToolbarProps) {
  const nextSort: TaskSortBy = sortBy === "dueDate" ? "createdAt" : "dueDate";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div
        role="radiogroup"
        aria-label="Status"
        className="flex max-w-full min-w-0 gap-0.5 overflow-x-auto rounded-xl surface-sunken p-1"
      >
        {STATUS_OPTIONS.map((option) => {
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onStatusChange(option.value)}
              className={`shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-sm outline-none! transition-colors focus-visible:shadow-focus ${
                active
                  ? "bg-base-300 text-base-content shadow-raised-sm"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {filter}
        <button
          type="button"
          onClick={() => onSortByChange(nextSort)}
          aria-label={`Sorted by ${SORT_LABELS[sortBy].long}. Switch to ${SORT_LABELS[nextSort].long}`}
          title={`Sort by ${SORT_LABELS[nextSort].long}`}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-field px-2 font-mono text-meta text-base-content/60 outline-none! transition-colors hover:bg-line hover:text-base-content focus-visible:shadow-focus"
        >
          <ArrowDownUp size={13} />
          {SORT_LABELS[sortBy].short}
        </button>
      </div>
    </div>
  );
}
