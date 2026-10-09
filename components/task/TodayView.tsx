"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { isTodayOrOverdue, isSameLocalDay } from "@/lib/utils/isDueToday";
import TaskList from "@/components/task/TaskList";
import WeekAheadStrip from "@/components/task/WeekAheadStrip";
import TaskQuickAdd from "@/components/task/TaskQuickAdd";
import StreakBadge from "@/components/stats/StreakBadge";
import { APP_LOCALE } from "@/lib/constants/locale";

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
 *
 * A slim header shows the date and the streak badge (#219), which links
 * to /stats. A quick-add bar sits above the cards (#205). Text without a date is due
 * today — or on the day drilled into, since that is the day being looked at.
 */
export default function TodayView() {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const baseFilter = selectedDay
    ? (tasks: Task[]) =>
        tasks.filter((task) => task.dueDate !== null && isSameLocalDay(task.dueDate, selectedDay))
    : scopeToTodayOrOverdue;

  const emptyMessage = selectedDay
    ? `Nothing due ${selectedDay.toLocaleDateString(APP_LOCALE, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })}.`
    : "Nothing due today or overdue — you're all caught up!";

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-1">
        <div>
          <h1 className="text-lg font-semibold">Today</h1>
          {/* The server renders in UTC; near midnight the browser's local date can
              differ, so React is told this text may change on hydration. */}
          <p className="text-xs text-base-content/50" suppressHydrationWarning>
            {new Date().toLocaleDateString(APP_LOCALE, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <StreakBadge />
      </header>
      {selectedDay && (
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-3">
          <p className="text-sm text-base-content/70">
            Showing{" "}
            {selectedDay.toLocaleDateString(APP_LOCALE, {
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
      <TaskList
        baseFilter={baseFilter}
        emptyMessage={emptyMessage}
        header={(visibilityOf) => (
          <TaskQuickAdd defaultDate={selectedDay ?? new Date()} visibilityOf={visibilityOf} />
        )}
      />
      <WeekAheadStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />
    </div>
  );
}
