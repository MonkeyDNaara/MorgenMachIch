"use client";

import { useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Inbox } from "lucide-react";
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
import { isBacklogTask, sortBacklogTasks } from "@/lib/utils/backlog";
import {
  readBacklogVisible,
  subscribeBacklogVisible,
  writeBacklogVisible,
} from "@/lib/ui/backlogVisible";
import TaskListToolbar from "@/components/task/TaskListToolbar";
import LabelFilterBar from "@/components/task/LabelFilterBar";
import TaskCardList from "@/components/task/TaskCardList";
import TaskQuickAdd, { type QuickAddVisibility } from "@/components/task/TaskQuickAdd";
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
 * A third, hideable Backlog column (#182) lists open standalone tasks
 * without a due date (isBacklogTask), ordered by priority then age, with
 * an age marker on each card. They no longer appear in the Tasks column.
 * Label and priority filters apply to it like to the Recurring column;
 * status and sort don't. Whether it is shown is remembered per browser.
 *
 * One quick-add bar above the columns (#205) replaces the Backlog's own
 * input from #184: text without a date lands in the Backlog, a date sends
 * it to the Tasks column. It stays usable while the Backlog is hidden and
 * says so when a new task ends up somewhere not currently visible.
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
  const backlogVisible = useSyncExternalStore(
    subscribeBacklogVisible,
    readBacklogVisible,
    () => true,
  );

  function toggleLabelFilter(labelId: string) {
    setActiveLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  }

  if (tasks === undefined || series === undefined) {
    return <p className="p-8 text-center text-base-content/40">Loading…</p>;
  }

  const isEmpty = tasks.length === 0 && series.length === 0;

  const standaloneTasks = excludeSeriesOccurrences(tasks);
  const backlogTasks = standaloneTasks.filter(isBacklogTask);
  const datedTasks = standaloneTasks.filter((task) => !isBacklogTask(task));
  const visibleTasks = sortTasks(
    filterTasksByLabels(
      filterTasksByPriority(filterTasksByStatus(datedTasks, status), priority),
      activeLabelIds,
    ),
    sortBy,
  );
  const visibleBacklog = sortBacklogTasks(
    filterTasksByLabels(filterTasksByPriority(backlogTasks, priority), activeLabelIds),
  );

  function visibilityOf(task: Task): QuickAddVisibility {
    const narrowed = filterTasksByLabels(filterTasksByPriority([task], priority), activeLabelIds);
    if (isBacklogTask(task)) {
      if (!backlogVisible) return "out-of-scope";
      return narrowed.length === 0 ? "filtered" : "visible";
    }
    return filterTasksByStatus(narrowed, status).length === 0 ? "filtered" : "visible";
  }

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
      <div
        className={`mx-auto flex w-full items-start gap-3 px-6 pt-4 ${
          backlogVisible ? "max-w-5xl lg:max-w-7xl" : "max-w-5xl"
        }`}
      >
        <div className="min-w-0 flex-1">
          <TaskQuickAdd defaultDate={null} visibilityOf={visibilityOf} />
        </div>
        <button
          type="button"
          onClick={() => writeBacklogVisible(!backlogVisible)}
          aria-pressed={backlogVisible}
          className={`mt-2 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium outline-none! transition-colors ${
            backlogVisible
              ? "bg-base-300 text-base-content shadow-raised-sm"
              : "bg-base-300 text-base-content/60 hover:text-base-content"
          }`}
        >
          <Inbox size={14} />
          Backlog · {backlogTasks.length}
        </button>
      </div>
      <div
        className={`mx-auto grid w-full grid-cols-1 md:grid-cols-[minmax(0,3fr)_1px_minmax(0,2fr)] ${
          backlogVisible
            ? "max-w-5xl lg:max-w-7xl lg:grid-cols-[minmax(0,3fr)_1px_minmax(0,2fr)_1px_minmax(0,2fr)]"
            : "max-w-5xl"
        }`}
      >
        <div className="p-6">
          <div className="mx-auto w-full max-w-md">
            <p className="mb-3 font-mono text-xs text-base-content/40">Tasks</p>
            <TaskCardList
              tasks={visibleTasks}
              labels={labels ?? []}
              emptyMessage={
                isEmpty ? "No tasks yet — add one above." : "No tasks match the selected filters."
              }
            />
          </div>
        </div>
        <div className="hidden bg-line md:block" />
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
        {backlogVisible && (
          <>
            <div className="hidden bg-line lg:block" />
            <div className="border-t border-line p-6 md:col-span-3 lg:col-span-1 lg:border-t-0">
              <div className="mx-auto w-full max-w-xs">
                <p className="mb-3 font-mono text-xs text-base-content/40">
                  Backlog · {visibleBacklog.length}
                </p>
                <TaskCardList
                  tasks={visibleBacklog}
                  labels={labels ?? []}
                  showAge
                  showPlan
                  emptyMessage={
                    backlogTasks.length === 0
                      ? "Nothing in the backlog. Tasks without a due date show up here."
                      : "No backlog tasks match the selected filters."
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
