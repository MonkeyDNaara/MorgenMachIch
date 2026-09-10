"use client";

import type { Task } from "@/lib/types";
import PriorityDot from "@/components/task/PriorityDot";

const MAX_VISIBLE_TASKS = 3;

type CalendarDayCellProps = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
  onSelect: (date: Date) => void;
};

/**
 * One cell in the /calendar month grid (#145): the date number plus a
 * compact mini-list of that day's tasks (priority dot + truncated
 * title, capped at 3 with a "+N" overflow) — same idiom as the
 * week-ahead strip's day columns (#130), just in a 7-column grid
 * instead of a flex row. Deliberately title+dot only, no time badge or
 * labels — a glance, not a full view; click the cell to drill into
 * CalendarView's selectedDay for the full task list.
 *
 * Leading/trailing days from adjacent months still show their tasks
 * and stay clickable (so a task near a month boundary isn't a dead
 * end) but render at reduced opacity to read as "not this month."
 */
export default function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  tasks,
  onSelect,
}: CalendarDayCellProps) {
  const visible = tasks.slice(0, MAX_VISIBLE_TASKS);
  const overflow = tasks.length - visible.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={`flex min-h-[104px] cursor-pointer flex-col gap-1 rounded-box border border-transparent bg-base-200 p-2 text-left outline-none! transition-colors hover:border-primary/30 ${
        isCurrentMonth ? "" : "opacity-40"
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          isToday ? "bg-primary text-primary-content" : "text-base-content/70"
        }`}
      >
        {date.getDate()}
      </span>
      <div className="flex flex-col gap-1">
        {visible.map((task) => (
          <div key={task.id} className="flex items-center gap-1 text-xs text-base-content/80">
            <PriorityDot priority={task.priority} />
            <span
              className={`min-w-0 flex-1 truncate ${
                task.status === "done" ? "text-base-content/40 line-through" : ""
              }`}
            >
              {task.title}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <span className="text-[10px] font-medium text-base-content/40">+{overflow} more</span>
        )}
      </div>
    </button>
  );
}
