"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getTasks } from "@/lib/db/tasks";
import { upcomingWeekDays } from "@/lib/utils/upcomingWeekDays";
import { filterTasksByDay } from "@/lib/utils/filterTasksByDay";
import { formatTime } from "@/lib/utils/formatDueDate";
import PriorityDot from "@/components/task/PriorityDot";

const MAX_VISIBLE_TASKS = 3;

type WeekAheadStripProps = {
  selectedDay: Date | null;
  onSelectDay: (day: Date) => void;
};

/**
 * "What's up next" preview below the main /today list: one column per
 * remaining day this week (tomorrow through Sunday), open tasks only,
 * capped at 3 with a +N overflow — a glance, not a full view (click a
 * day to drill into it via TodayView's selectedDay). The whole section
 * hides on Sunday (nothing left in the week — see upcomingWeekDays), a
 * day with zero open tasks hides too, so the strip never shows empty
 * placeholder columns (#130).
 */
export default function WeekAheadStrip({ selectedDay, onSelectDay }: WeekAheadStripProps) {
  const tasks = useLiveQuery(() => getTasks(), []);
  const days = upcomingWeekDays();

  if (tasks === undefined || days.length === 0) return null;

  const dayColumns = days
    .map((day) => ({ day, tasks: filterTasksByDay(tasks, day) }))
    .filter((column) => column.tasks.length > 0);

  if (dayColumns.length === 0) return null;

  return (
    <div className="border-t border-white/5 px-6 py-4">
      <p className="mb-3 font-mono text-xs text-base-content/40">Coming up</p>
      <div className="flex flex-wrap gap-3">
        {dayColumns.map(({ day, tasks: dayTasks }) => {
          const visible = dayTasks.slice(0, MAX_VISIBLE_TASKS);
          const overflow = dayTasks.length - visible.length;
          const active = selectedDay !== null && day.toDateString() === selectedDay.toDateString();

          return (
            <button
              key={day.toDateString()}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={active}
              className={`flex w-36 cursor-pointer flex-col gap-1.5 rounded-box border bg-base-200 p-3 text-left outline-none! transition-colors hover:border-primary/30 ${
                active ? "border-primary/50" : "border-transparent"
              }`}
            >
              <p className="text-xs font-semibold text-base-content/70">
                {day.toLocaleDateString(undefined, { weekday: "short" })}{" "}
                <span className="font-normal text-base-content/40">
                  {day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </p>
              <div className="flex flex-col gap-1">
                {visible.map((task) => (
                  <div key={task.id} className="flex items-center gap-1.5 text-xs text-base-content/80">
                    <PriorityDot priority={task.priority} />
                    <span className="min-w-0 flex-1 truncate">{task.title}</span>
                    {!task.allDay && task.dueDate && (
                      <span className="flex-shrink-0 text-[10px] text-base-content/40">
                        {formatTime(task.dueDate)}
                      </span>
                    )}
                  </div>
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] font-medium text-base-content/40">+{overflow} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
