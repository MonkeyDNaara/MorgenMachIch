"use client";

import type { StatusFilter } from "@/lib/utils/filterTasksByStatus";
import type { PriorityFilter } from "@/lib/utils/filterTasksByPriority";
import type { TaskSortBy } from "@/lib/utils/sortTasks";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";

// "skipped" is a valid TaskStatus in the schema but nothing sets it yet
// — there's no skip action until the Recurring Tasks epic ships one, so
// it's left out here rather than showing a filter that's always empty.
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
];

type TaskListToolbarProps = {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  priority: PriorityFilter;
  onPriorityChange: (priority: PriorityFilter) => void;
  sortBy: TaskSortBy;
  onSortByChange: (sortBy: TaskSortBy) => void;
};

/**
 * Status filter (single-select pill row — a task only has one status,
 * unlike labels), plus priority and sort dropdowns, for /tasks. Priority
 * is a dropdown rather than a second pill row (#140) — it's a secondary
 * filter next to status, and a second full pill row would crowd this
 * toolbar. Sits above the label filter bar. Plain component state owned
 * by TaskList, resets on reload, same as the label filter.
 */
export default function TaskListToolbar({
  status,
  onStatusChange,
  priority,
  onPriorityChange,
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
      <div className="flex items-center gap-2">
        <select
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)}
          aria-label="Filter by priority"
          className={`select select-sm ${FIELD_FOCUS}`}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(event) => onSortByChange(event.target.value as TaskSortBy)}
          aria-label="Sort tasks by"
          className={`select select-sm w-52 ${FIELD_FOCUS}`}
        >
          <option value="dueDate">Due date (soonest first)</option>
          <option value="createdAt">Created (newest first)</option>
        </select>
      </div>
    </div>
  );
}
