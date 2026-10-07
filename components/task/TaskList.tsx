"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Task } from "@/lib/types";
import { getTasks } from "@/lib/db/tasks";
import { getLabels } from "@/lib/db/labels";
import { filterTasksByLabels } from "@/lib/utils/filterTasksByLabels";
import { filterTasksByStatus, type StatusFilter } from "@/lib/utils/filterTasksByStatus";
import { filterTasksByPriority, type PriorityFilter } from "@/lib/utils/filterTasksByPriority";
import { sortTasks, type TaskSortBy } from "@/lib/utils/sortTasks";
import TaskCardList from "@/components/task/TaskCardList";
import LabelFilterBar from "@/components/task/LabelFilterBar";
import TaskListToolbar from "@/components/task/TaskListToolbar";

type TaskListProps = {
  /**
   * Narrows which tasks this list ever shows, applied before the
   * status/label toolbar filters below. Lets /today reuse this exact
   * component (today/overdue scope) instead of duplicating it (#126).
   */
  baseFilter?: (tasks: Task[]) => Task[];
  /** Shown instead of the generic "no matches" message when baseFilter
   * (plus the toolbar filters) leaves nothing to show. */
  emptyMessage?: string;
  /** Hides this list's own label bar and priority dropdown when the
   * surrounding view applies those filters itself through `baseFilter`
   * (/calendar's day view, #171). Status and sort stay. */
  hideLabelAndPriorityFilters?: boolean;
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
  emptyMessage,
  hideLabelAndPriorityFilters = false,
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

  if (tasks.length === 0) {
    return (
      <p className="p-8 text-center text-base-content/40">No tasks yet — hit the + button.</p>
    );
  }

  const scopedTasks = baseFilter ? baseFilter(tasks) : tasks;
  const visibleTasks = sortTasks(
    filterTasksByLabels(
      filterTasksByPriority(filterTasksByStatus(scopedTasks, status), priority),
      activeLabelIds,
    ),
    sortBy,
  );

  return (
    <div className="flex flex-col">
      <TaskListToolbar
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        hidePriority={hideLabelAndPriorityFilters}
      />
      {!hideLabelAndPriorityFilters && (
        <LabelFilterBar
          labels={labels ?? []}
          activeLabelIds={activeLabelIds}
          onToggle={toggleLabelFilter}
          onClear={() => setActiveLabelIds([])}
        />
      )}
      <div className="mx-auto w-full max-w-3xl p-6">
        <TaskCardList
          tasks={visibleTasks}
          labels={labels ?? []}
          emptyMessage={emptyMessage ?? "No tasks match the selected filters."}
        />
      </div>
    </div>
  );
}
