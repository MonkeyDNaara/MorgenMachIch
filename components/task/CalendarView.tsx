"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "@/lib/types";
import { getTasks } from "@/lib/db/tasks";
import { getMonthGrid } from "@/lib/utils/monthGrid";
import { groupTasksByDate, dateKey } from "@/lib/utils/groupTasksByDate";
import { isSameLocalDay } from "@/lib/utils/isDueToday";
import TaskList from "@/components/task/TaskList";
import CalendarDayCell from "@/components/task/CalendarDayCell";

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
 * Recurring task occurrences aren't rendered yet — there's no
 * TaskSeries UI until the Recurring Tasks epic ships one — and the
 * week-view toggle is a separate stretch issue once this ships (#145).
 */
export default function CalendarView() {
  const tasks = useLiveQuery(() => getTasks(), []);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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

  if (selectedDay) {
    const label = selectedDay.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-3">
          <p className="text-sm text-base-content/70">Showing {label}</p>
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="btn btn-ghost btn-xs cursor-pointer text-base-content/60"
          >
            Back to month
          </button>
        </div>
        <TaskList baseFilter={scopeToSelectedDay(selectedDay)} emptyMessage={`Nothing due ${label}.`} />
      </div>
    );
  }

  if (tasks === undefined) {
    return <p className="p-8 text-center text-base-content/40">Loading…</p>;
  }

  const grid = getMonthGrid(viewYear, viewMonth, today);
  const tasksByDate = groupTasksByDate(tasks);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{monthLabel}</h1>
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
      </div>
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
            tasks={tasksByDate.get(dateKey(date)) ?? []}
            onSelect={setSelectedDay}
          />
        ))}
      </div>
    </div>
  );
}
