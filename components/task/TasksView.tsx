"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Task } from "@/lib/types";
import { getTasks } from "@/lib/db/tasks";
import { getLabels } from "@/lib/db/labels";
import { listTaskSeries } from "@/lib/db/taskSeries";
import { filterTasksByLabels } from "@/lib/utils/filterTasksByLabels";
import { filterTasksByStatus, type StatusFilter } from "@/lib/utils/filterTasksByStatus";
import { filterTasksByPriority, type PriorityFilter } from "@/lib/utils/filterTasksByPriority";
import { filterSeriesByPriority } from "@/lib/utils/filterSeriesByPriority";
import { filterSeriesByLabels } from "@/lib/utils/filterSeriesByLabels";
import { sortTasks, type TaskSortBy } from "@/lib/utils/sortTasks";
import TaskListToolbar from "@/components/task/TaskListToolbar";
import LabelFilterBar from "@/components/task/LabelFilterBar";
import TaskCardList from "@/components/task/TaskCardList";
import SeriesRow from "@/components/task/SeriesRow";

function excludeSeriesOccurrences(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.seriesId === null);
}

/**
 * /tasks' own view (#62) — a two-column layout rather than the flat
 * TaskList Today/Calendar use, so one shared toolbar (status/priority/
 * label filters) can drive both the standalone-task list on the left
 * and the Recurring column (one row per TaskSeries) on the right, side
 * by side, instead of a daily/weekly series flooding a flat list with
 * dozens of individual occurrence rows.
 *
 * Status and sort are task-only concepts with no equivalent on a
 * TaskSeries (no status, no due date) — by design (see #62 discussion)
 * they only affect the left column. Priority and labels apply to both,
 * via filterSeriesByPriority/filterSeriesByLabels mirroring the task
 * versions. The Recurring column always sorts active series first, then
 * paused, regardless of the sort dropdown.
 *
 * Card rendering is shared with TaskList via TaskCardList; the toolbar
 * and label filter bar are the same components TaskList itself uses,
 * just rendered here directly since this view owns the filter state
 * instead of letting TaskList own it privately.
 */
export default function TasksView() {
  const tasks = useLiveQuery(() => getTasks(), []);
  const labels = useLiveQuery(() => getLabels(), []);
  const series = useLiveQuery(() => listTaskSeries(), []);

  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [sortBy, setSortBy] = useState<TaskSortBy>("dueDate");

  function toggleLabelFilter(labelId: string) {
    setActiveLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  }

  if (tasks === undefined || series === undefined) {
    return <p className="p-8 text-center text-base-content/40">Loading…</p>;
  }

  if (tasks.length === 0 && series.length === 0) {
    return <p className="p-8 text-center text-base-content/40">No tasks yet — hit the + button.</p>;
  }

  const standaloneTasks = excludeSeriesOccurrences(tasks);
  const visibleTasks = sortTasks(
    filterTasksByLabels(
      filterTasksByPriority(filterTasksByStatus(standaloneTasks, status), priority),
      activeLabelIds,
    ),
    sortBy,
  );

  const visibleSeries = [
    ...filterSeriesByLabels(filterSeriesByPriority(series, priority), activeLabelIds),
  ].sort((a, b) => Number(b.active) - Number(a.active));

  return (
    <div className="flex flex-col">
      <TaskListToolbar
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />
      <LabelFilterBar
        labels={labels ?? []}
        activeLabelIds={activeLabelIds}
        onToggle={toggleLabelFilter}
        onClear={() => setActiveLabelIds([])}
      />
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 md:grid-cols-[minmax(0,3fr)_1px_minmax(0,2fr)]">
        <div className="p-6">
          <div className="mx-auto w-full max-w-md">
            <p className="mb-3 font-mono text-xs text-base-content/40">Tasks</p>
            <TaskCardList
              tasks={visibleTasks}
              labels={labels ?? []}
              emptyMessage="No tasks match the selected filters."
            />
          </div>
        </div>
        <div className="hidden bg-white/5 md:block" />
        <div className="p-6">
          <div className="mx-auto w-full max-w-xs">
            <p className="mb-3 font-mono text-xs text-base-content/40">Recurring</p>
            {visibleSeries.length === 0 ? (
              <p className="p-8 text-center text-base-content/40">
                No recurring tasks match the selected filters.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {visibleSeries.map((s) => (
                  <SeriesRow key={s.id} series={s} labels={labels ?? []} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
