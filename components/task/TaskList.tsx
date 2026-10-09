"use client";

import { useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Task } from "@/lib/types";
import { getTasks } from "@/lib/db/tasks";
import { getLabels } from "@/lib/db/labels";
import { filterTasksByLabels } from "@/lib/utils/filterTasksByLabels";
import { filterTasksByStatus, type StatusFilter } from "@/lib/utils/filterTasksByStatus";
import { filterTasksByPriority, type PriorityFilter } from "@/lib/utils/filterTasksByPriority";
import { sortTasks, type TaskSortBy } from "@/lib/utils/sortTasks";
import TaskCardList from "@/components/task/TaskCardList";
import FilterPopover from "@/components/task/FilterPopover";
import TaskListToolbar from "@/components/task/TaskListToolbar";
import EmptyState, { type EmptyCopy } from "@/components/layout/EmptyState";
import { ListTodo, SlidersHorizontal } from "lucide-react";

const NO_TASKS_YET: EmptyCopy = {
  icon: ListTodo,
  title: "No tasks yet.",
  hint: "Type one above — try “Call mom fri 3pm #family”.",
};
const FILTERED: EmptyCopy = {
  icon: SlidersHorizontal,
  title: "No tasks match these filters.",
  hint: "Change or clear the filters to see more.",
};
import type { QuickAddVisibility } from "@/components/task/TaskQuickAdd";

type TaskListProps = {
  /**
   * Narrows which tasks this list ever shows, applied before the
   * status/label toolbar filters below. Lets /today reuse this exact
   * component (today/overdue scope) instead of duplicating it (#126).
   */
  baseFilter?: (tasks: Task[]) => Task[];
  /** Shown instead of the generic "no matches" message when baseFilter
   * (plus the toolbar filters) leaves nothing to show. */
  empty?: EmptyCopy;
  /** Hides this list's own label bar and priority dropdown when the
   * surrounding view applies those filters itself through `baseFilter`
   * (/calendar's day view, #171). Status and sort stay. */
  hideLabelAndPriorityFilters?: boolean;
  /** Rendered above the cards, in the same column — /today's quick-add bar
   * (#205). Gets a check that tells whether a task would show up in this
   * list (scope + current filters), so the bar can explain when it won't. */
  header?: (visibilityOf: (task: Task) => QuickAddVisibility) => ReactNode;
};

/**
 * Minimal task list, built ahead of the List View epic just so the drawer
 * has a real UI hook: something to click to open edit mode, so #27
 * (edit), #28 (delete), and #29 (toggle) can each be verified as they're
 * built instead of working blind until a full list view exists. The List
 * View epic (#123: sorting + status filter) extends this rather than
 * replacing it.
 *
 * useLiveQuery subscribes directly to the Dexie query, so this re-renders
 * automatically on every create/edit/delete/toggle, anywhere in the app,
 * with no manual refetch wiring.
 *
 * Labels are fetched once here (not per-card) and passed down, so N
 * cards don't each open their own identical live query (added for #118).
 *
 * All filter/sort state (labels, status, sort) is plain component
 * state — resets on reload/navigation, no persistence, matching the
 * rest of the app's UI state today.
 *
 * Card rendering itself lives in TaskCardList (#62) — extracted out so
 * TasksView can reuse the exact same card rendering while owning its
 * own lifted filter state (needed so one shared toolbar can filter both
 * the task list and the Recurring column side by side on /tasks).
 */
export default function TaskList({
  baseFilter,
  empty,
  hideLabelAndPriorityFilters = false,
  header,
}: TaskListProps = {}) {
  const tasks = useLiveQuery(() => getTasks(), []);
  const labels = useLiveQuery(() => getLabels(), []);
  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [sortBy, setSortBy] = useState<TaskSortBy>("dueDate");

  function toggleLabelFilter(labelId: string) {
    setActiveLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  }

  if (tasks === undefined) {
    return <p className="p-8 text-center text-base-content/40">Loading…</p>;
  }

  const applyFilters = (list: Task[]) =>
    filterTasksByLabels(
      filterTasksByPriority(filterTasksByStatus(list, status), priority),
      activeLabelIds,
    );
  const visibilityOf = (task: Task): QuickAddVisibility => {
    if (baseFilter && baseFilter([task]).length === 0) return "out-of-scope";
    return applyFilters([task]).length === 0 ? "filtered" : "visible";
  };

  // With a header (the quick-add bar) the full layout renders even with no
  // tasks, so the bar keeps its place — and its focus — when the first task
  // is added.
  if (tasks.length === 0 && !header) {
    return (
      <EmptyState {...NO_TASKS_YET} hint="Hit the + button to add your first one." />
    );
  }

  const scopedTasks = baseFilter ? baseFilter(tasks) : tasks;
  // With filters on, an empty list means "filtered out", not "free day".
  const filtersActive = status !== "all" || priority !== "all" || activeLabelIds.length > 0;
  const visibleTasks = sortTasks(applyFilters(scopedTasks), sortBy);

  return (
    <div className="flex flex-col">
      <TaskListToolbar
        className="mx-auto w-full max-w-3xl px-6 pt-6"
        status={status}
        onStatusChange={setStatus}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        filter={
          !hideLabelAndPriorityFilters && (
            <FilterPopover
              labels={labels ?? []}
              activeLabelIds={activeLabelIds}
              onToggleLabel={toggleLabelFilter}
              priority={priority}
              onPriorityChange={setPriority}
              onClear={() => {
                setActiveLabelIds([]);
                setPriority("all");
              }}
            />
          )
        }
      />
      <div className="mx-auto w-full max-w-3xl p-6">
        {header && <div className="mb-4">{header(visibilityOf)}</div>}
        <TaskCardList
          tasks={visibleTasks}
          labels={labels ?? []}
          empty={
            tasks.length === 0
              ? NO_TASKS_YET
              : filtersActive
                ? FILTERED
                : (empty ?? FILTERED)
          }
        />
      </div>
    </div>
  );
}
