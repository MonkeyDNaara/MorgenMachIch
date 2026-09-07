"use client";

import type { StatusFilter } from "@/lib/utils/filterTasksByStatus";
import type { TaskSortBy } from "@/lib/utils/sortTasks";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
];

type TaskListToolbarProps = {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  sortBy: TaskSortBy;
  onSortByChange: (sortBy: TaskSortBy) => void;
};

/**
 * Status filter (single-select pill row — a task only has one status,
 * unlike labels) and sort control for /tasks. Sits above the label
 * filter bar. Plain component state owned by TaskList, resets on
 * reload, same as the label filter.
 */
export default function TaskListToolbar({
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
}: TaskListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-3">
      <div className="flex gap-1.5">
        {STATUS_OPTIONS.map((option) => {
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              aria-pressed={active}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium outline-none! transition-colors ${
                active
                  ? "bg-primary text-primary-content"
                  : "bg-base-300 text-base-content/60 hover:text-base-content"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <select
        value={sortBy}
        onChange={(event) => onSortByChange(event.target.value as TaskSortBy)}
        aria-label="Sort tasks by"
        className={`select select-sm ${FIELD_FOCUS}`}
      >
        <option value="dueDate">Due date (soonest first)</option>
        <option value="createdAt">Created (newest first)</option>
      </select>
    </div>
  );
}
