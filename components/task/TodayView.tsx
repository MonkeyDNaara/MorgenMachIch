"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Task } from "@/lib/types";
import { getTasks } from "@/lib/db/tasks";
import { dayProgress } from "@/lib/utils/dayProgress";
import { isTodayOrOverdue, isSameLocalDay } from "@/lib/utils/isDueToday";
import TaskList from "@/components/task/TaskList";
import WeekAheadStrip from "@/components/task/WeekAheadStrip";
import TaskQuickAdd from "@/components/task/TaskQuickAdd";
import StreakBadge from "@/components/stats/StreakBadge";
import PageHeader from "@/components/layout/PageHeader";
import DayProgress from "@/components/task/DayProgress";
import { CalendarDays, Sunrise } from "lucide-react";
import type { EmptyCopy } from "@/components/layout/EmptyState";
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
 * The header (#233) is editorial: an eyebrow with the date, the weekday
 * as a display title, today's progress (dayProgress) and the streak
 * badge (#219), which links to /stats. A quick-add bar sits above the cards (#205). Text without a date is due
 * today — or on the day drilled into, since that is the day being looked at.
 */
export default function TodayView() {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const tasks = useLiveQuery(() => getTasks(), []);
  const now = new Date();

  const baseFilter = selectedDay
    ? (tasks: Task[]) =>
        tasks.filter((task) => task.dueDate !== null && isSameLocalDay(task.dueDate, selectedDay))
    : scopeToTodayOrOverdue;

  const empty: EmptyCopy = selectedDay
    ? {
        icon: CalendarDays,
        title: `Nothing due ${selectedDay.toLocaleDateString(APP_LOCALE, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}.`,
        hint: "Add something above, or pick another day below.",
      }
    : {
        icon: Sunrise,
        title: "Nothing left for today.",
        hint: "Morgen can wait. Add something above if you're still in the mood.",
      };

  return (
    <div className="flex flex-col">
      {/* The server renders in UTC; near midnight the browser's local date can
          differ, so React is told the date text may change on hydration. */}
      <PageHeader
        className="mx-auto w-full max-w-3xl px-6 pt-8"
        eyebrow={
          <span suppressHydrationWarning>
            <span className="text-accent">Today</span> ·{" "}
            {now.toLocaleDateString(APP_LOCALE, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        }
        title={
          <span suppressHydrationWarning>
            {now.toLocaleDateString(APP_LOCALE, { weekday: "long" })}.
          </span>
        }
        titleSize="display"
        meta={!selectedDay && tasks ? <DayProgress {...dayProgress(tasks, now)} /> : undefined}
        actions={<StreakBadge />}
      />
      {selectedDay && (
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
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
        empty={empty}
        header={(visibilityOf) => (
          <TaskQuickAdd defaultDate={selectedDay ?? new Date()} visibilityOf={visibilityOf} />
        )}
      />
      <WeekAheadStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />
    </div>
  );
}
