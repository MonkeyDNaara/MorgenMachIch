"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getTasks } from "@/lib/db/tasks";
import { upcomingWeekDays } from "@/lib/utils/upcomingWeekDays";
import { filterTasksByDay } from "@/lib/utils/filterTasksByDay";
import { formatTime } from "@/lib/utils/formatDueDate";
import PriorityDot from "@/components/task/PriorityDot";
import { APP_LOCALE } from "@/lib/constants/locale";

const MAX_VISIBLE_TASKS = 3;

type WeekAheadStripProps = {
  selectedDay: Date | null;
  onSelectDay: (day: Date) => void;
};

/**
 * "What's up next" preview below the main /today list: one column per
 * day from tomorrow through Sunday — on the weekend through next week's
 * Sunday (#282, see upcomingWeekDays) — open tasks only, capped at 3 with
 * a +N overflow: a glance, not a full view (click a day to drill into it
 * via TodayView's selectedDay). A day with zero open tasks hides, so the
 * strip never shows empty placeholder columns (#130). The columns keep
 * their width and the row scrolls sideways when they don't fit (up to 8
 * on a Saturday). Each card has a clear header (#331): weekday 15 px
 * semibold + mono date over a divider; tomorrow's card says "Tomorrow" in
 * accent with a 2 px accent divider.
 */
export default function WeekAheadStrip({ selectedDay, onSelectDay }: WeekAheadStripProps) {
  const tasks = useLiveQuery(() => getTasks(), []);
  const days = upcomingWeekDays();

  if (tasks === undefined || days.length === 0) return null;

  const dayColumns = days
    .map((day) => ({ day, tasks: filterTasksByDay(tasks, day) }))
    .filter((column) => column.tasks.length > 0);

  if (dayColumns.length === 0) return null;

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString();

  return (
    <div className="border-t border-line px-6 py-4">
      <p className="mb-3 font-mono text-xs text-faint">Coming up</p>
      {/* Padding + matching negative margin: overflow-x-auto would otherwise
          clip the cards' raised shadow and the focus ring. */}
      <div className="-mx-2 -mt-2 -mb-4 flex gap-3 overflow-x-auto px-2 pt-2 pb-4">
        {dayColumns.map(({ day, tasks: dayTasks }) => {
          const visible = dayTasks.slice(0, MAX_VISIBLE_TASKS);
          const overflow = dayTasks.length - visible.length;
          const active = selectedDay !== null && day.toDateString() === selectedDay.toDateString();
          // Days without tasks are hidden, so the first card isn't always tomorrow.
          const isTomorrow = day.toDateString() === tomorrow;

          return (
            <button
              key={day.toDateString()}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={active}
              className={`flex w-36 shrink-0 cursor-pointer flex-col gap-1.5 surface-raised border p-3 text-left outline-none! transition-colors hover:border-accent/30 focus-visible:shadow-focus ${
                active ? "border-accent/50" : "border-transparent"
              }`}
            >
              <p
                className={`mb-0.5 flex flex-wrap items-baseline justify-between gap-x-2 pb-1.5 ${
                  isTomorrow ? "border-b-2 border-accent" : "border-b border-line-strong"
                }`}
              >
                <span
                  className={`text-[15px] leading-tight font-semibold ${isTomorrow ? "text-accent" : ""}`}
                >
                  {isTomorrow ? "Tomorrow" : day.toLocaleDateString(APP_LOCALE, { weekday: "short" })}
                </span>
                <span className="shrink-0 font-mono text-meta text-subtle">
                  {day.toLocaleDateString(APP_LOCALE, { day: "numeric", month: "short" })}
                </span>
              </p>
              <div className="flex flex-col gap-1">
                {visible.map((task) => (
                  <div key={task.id} className="flex items-center gap-1.5 text-xs text-base-content/80">
                    <PriorityDot priority={task.priority} />
                    <span className="min-w-0 flex-1 truncate">{task.title}</span>
                    {!task.allDay && task.dueDate && (
                      <span className="flex-shrink-0 text-[10px] text-faint">
                        {formatTime(task.dueDate)}
                      </span>
                    )}
                  </div>
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] font-medium text-faint">+{overflow} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
