"use client";

import { Repeat } from "lucide-react";
import type { CalendarEntry } from "@/lib/utils/calendarEntries";
import PriorityDot from "@/components/task/PriorityDot";

const MAX_VISIBLE_TASKS = 3;

type CalendarDayCellProps = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
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
 * Takes CalendarEntry view-models rather than Tasks (#168) so it renders
 * real tasks and projected (ghost) occurrences identically: recurring
 * entries get a small repeat icon, ghosts are dimmed.
 *
 * Leading/trailing days from adjacent months still show their tasks
 * and stay clickable (so a task near a month boundary isn't a dead
 * end) but render at reduced opacity to read as "not this month."
 */
export default function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  entries,
  onSelect,
}: CalendarDayCellProps) {
  const visible = entries.slice(0, MAX_VISIBLE_TASKS);
  const overflow = entries.length - visible.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={`flex min-h-[104px] cursor-pointer flex-col gap-1 surface-panel p-2 text-left outline-none! transition-colors hover:border-accent/30 ${
        isCurrentMonth ? "" : "opacity-40"
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          isToday ? "bg-accent text-accent-content" : "text-base-content/70"
        }`}
      >
        {date.getDate()}
      </span>
      <div className="flex flex-col gap-1">
        {visible.map((entry) => (
          <div
            key={entry.key}
            className={`flex items-center gap-1 text-xs text-base-content/80 ${entry.isGhost ? "opacity-50" : ""}`}
          >
            <PriorityDot priority={entry.priority} />
            {entry.isRecurring && <Repeat size={10} className="flex-shrink-0 text-base-content/50" aria-hidden="true" />}
            <span
              className={`min-w-0 flex-1 truncate ${
                entry.status === "done" ? "text-base-content/40 line-through" : ""
              }`}
            >
              {entry.title}
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
