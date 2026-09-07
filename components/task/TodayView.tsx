"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { isTodayOrOverdue, isSameLocalDay } from "@/lib/utils/isDueToday";
import TaskList from "@/components/task/TaskList";
import WeekAheadStrip from "@/components/task/WeekAheadStrip";

function scopeToTodayOrOverdue(tasks: Task[]): Task[] {
  return tasks.filter(isTodayOrOverdue);
}

/**
 * /today's take on the shared TaskList: scoped to tasks due today (any
 * status) or overdue-and-not-done by default (see isTodayOrOverdue),
 * with the same status/label filtering and sorting /tasks already
 * offers layered on top (#126).
 *
 * The week-ahead strip below lets a day be selected to drill into it
 * instead of the default scope — same "any status" convention as
 * today's own view, just narrowed to that exact date — with a "Back to
 * Today" control to return to the default (#130).
 */
export default function TodayView() {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const baseFilter = selectedDay
    ? (tasks: Task[]) =>
        tasks.filter((task) => task.dueDate !== null && isSameLocalDay(task.dueDate, selectedDay))
    : scopeToTodayOrOverdue;

  const emptyMessage = selectedDay
    ? `Nothing due ${selectedDay.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })}.`
    : "Nothing due today or overdue — you're all caught up!";

  return (
    <div className="flex flex-col">
      {selectedDay && (
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-3">
          <p className="text-sm text-base-content/70">
            Showing{" "}
            {selectedDay.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="btn btn-ghost btn-xs cursor-pointer text-base-content/60"
          >
            Back to Today
          </button>
        </div>
      )}
      <TaskList baseFilter={baseFilter} emptyMessage={emptyMessage} />
      <WeekAheadStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />
    </div>
  );
}
