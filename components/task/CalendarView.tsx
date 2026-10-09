"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "@/lib/types";
import { getTasks } from "@/lib/db/tasks";
import { listTaskSeries } from "@/lib/db/taskSeries";
import { getLabels } from "@/lib/db/labels";
import { getMonthGrid } from "@/lib/utils/monthGrid";
import { groupTasksByDate, dateKey } from "@/lib/utils/groupTasksByDate";
import { isSameLocalDay } from "@/lib/utils/isDueToday";
import { filterTasksByLabels } from "@/lib/utils/filterTasksByLabels";
import { filterTasksByPriority, type PriorityFilter } from "@/lib/utils/filterTasksByPriority";
import { projectSeriesOccurrences } from "@/lib/utils/projectOccurrences";
import { ghostToEntry, hasDueDate, taskToEntry } from "@/lib/utils/calendarEntries";
import TaskList from "@/components/task/TaskList";
import CalendarDayCell from "@/components/task/CalendarDayCell";
import ProjectedOccurrenceList from "@/components/task/ProjectedOccurrenceList";
import PriorityFilterSelect from "@/components/task/PriorityFilterSelect";
import LabelFilterBar from "@/components/task/LabelFilterBar";
import PageHeader from "@/components/layout/PageHeader";
import { APP_LOCALE } from "@/lib/constants/locale";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function scopeToSelectedDay(day: Date) {
  return (tasks: Task[]) =>
    tasks.filter((task) => task.dueDate !== null && isSameLocalDay(task.dueDate, day));
}

/**
 * /calendar's month view (#145). Two states, same selectedDay pattern
 * as TodayView: the month grid by default, or — once a day cell is
 * clicked — the shared TaskList scoped to that exact date (any status,
 * matching TodayView's day drill-down convention) with a "Back to
 * month" control to return to the grid.
 *
 * Tasks are fetched once and bucketed by local day via
 * groupTasksByDate rather than filtered per cell, since the grid can
 * have up to ~42 cells.
 *
 * Recurring occurrences are ordinary Task rows, so they show up like any
 * other task — but rows only exist ~60 days ahead. Beyond that, the
 * visible grid also gets read-only projected "ghost" occurrences
 * computed from the active series (#168, projectSeriesOccurrences) so
 * a series doesn't look like it ended; nothing is written to the DB.
 *
 * Label (multi, OR) and priority (single) filters live here (#171) and
 * apply to the grid, its projected occurrences, and the day drill-down
 * alike — one filter bar above both states, with TaskList's own
 * label/priority controls hidden in the day view so there is only one
 * source of truth. Plain state, resets on reload, like the other filters.
 *
 * The week-view toggle is a separate stretch issue (#145).
 */
export default function CalendarView() {
  const tasks = useLiveQuery(() => getTasks(), []);
  const series = useLiveQuery(() => listTaskSeries(), []);
  const labels = useLiveQuery(() => getLabels(), []);
  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  function toggleLabelFilter(labelId: string) {
    setActiveLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  }

  /** Same label + priority filtering for real tasks and ghosts. */
  function applyFilters<T extends { labelIds: string[]; priority: Task["priority"] }>(
    items: T[],
  ): T[] {
    return filterTasksByLabels(filterTasksByPriority(items, priority), activeLabelIds);
  }

  const filterBar = (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-line px-6 py-3">
        <PriorityFilterSelect value={priority} onChange={setPriority} />
      </div>
      <LabelFilterBar
        labels={labels ?? []}
        activeLabelIds={activeLabelIds}
        onToggle={toggleLabelFilter}
        onClear={() => setActiveLabelIds([])}
      />
    </div>
  );

  function goToPrevMonth() {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(prev.getFullYear());
    setViewMonth(prev.getMonth());
  }

  function goToNextMonth() {
    const next = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToCurrentMonth() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  const grid = getMonthGrid(viewYear, viewMonth, today);
  const ghosts =
    tasks && series
      ? projectSeriesOccurrences(series, tasks, grid[0].date, grid[grid.length - 1].date, today)
      : [];

  if (selectedDay) {
    const dayGhosts = applyFilters(ghosts).filter((ghost) =>
      isSameLocalDay(ghost.dueDate, selectedDay),
    );
    const filtersActive = priority !== "all" || activeLabelIds.length > 0;
    const label = selectedDay.toLocaleDateString(APP_LOCALE, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    return (
      <div className="flex flex-col">
        <PageHeader
          className="px-6 pt-8 pb-6"
          eyebrow="Calendar"
          title={label}
          actions={
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="btn btn-ghost btn-xs cursor-pointer text-base-content/60"
            >
              Back to month
            </button>
          }
        />
        {filterBar}
        <TaskList
          baseFilter={(allTasks) => applyFilters(scopeToSelectedDay(selectedDay)(allTasks))}
          hideLabelAndPriorityFilters
          emptyMessage={
            dayGhosts.length > 0
              ? `No tasks generated for ${label} yet.`
              : filtersActive
                ? `No matching tasks for ${label}.`
                : `Nothing due ${label}.`
          }
        />
        <ProjectedOccurrenceList ghosts={dayGhosts} />
      </div>
    );
  }

  if (tasks === undefined || series === undefined) {
    return <p className="p-8 text-center text-base-content/40">Loading…</p>;
  }

  // Skipped occurrences are hidden from the grid (added for #61) — this
  // bucketing path doesn't go through TaskList's status filter, so it
  // needs its own exclusion. Real entries first, ghosts after.
  const entriesByDate = groupTasksByDate([
    ...applyFilters(tasks.filter((task) => task.status !== "skipped"))
      .filter(hasDueDate)
      .map(taskToEntry),
    ...applyFilters(ghosts).map(ghostToEntry),
  ]);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(APP_LOCALE, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        className="px-6 pt-8 pb-6"
        eyebrow="Calendar"
        title={monthLabel}
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label="Previous month"
              className="btn btn-ghost btn-xs cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToCurrentMonth}
              className="btn btn-ghost btn-xs cursor-pointer text-base-content/60"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Next month"
              className="btn btn-ghost btn-xs cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />
      {filterBar}
      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-base-content/40">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {grid.map(({ date, isCurrentMonth, isToday }) => (
            <CalendarDayCell
              key={date.toDateString()}
              date={date}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              entries={entriesByDate.get(dateKey(date)) ?? []}
              onSelect={setSelectedDay}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
