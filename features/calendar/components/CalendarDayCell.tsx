"use client";

import { Repeat } from "lucide-react";
import { useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import type { CalendarEntry } from "@/features/calendar/lib/calendarEntries";
import { APP_LOCALE } from "@/lib/constants/locale";
import { formatDropDay } from "@/features/dnd/lib/dndAnnouncements";
import { dragTaskId, dropDayId, isOnDay } from "@/features/dnd/lib/reschedule";
import PriorityDot from "@/features/tasks/components/card/PriorityDot";
import type { DraggedTask } from "@/features/dnd/types";

const MAX_VISIBLE_TASKS = 3;

type CalendarDayCellProps = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
  onSelect: (date: Date) => void;
  /** Whether a dragged task may land on this day (today or later, #74). */
  acceptsDrop: boolean;
  /** Whether entries can be picked up with the pointer (off below `md`). */
  dragEnabled: boolean;
};

/**
 * One cell in the /calendar month grid (#145): the date number plus a
 * compact mini-list of that day's tasks (priority dot + truncated
 * title, capped at 3 with a "+N" overflow) — same idiom as the
 * week-ahead strip's day columns (#130). Deliberately title+dot only, no
 * time badge or labels — a glance, not a full view; click the cell to
 * drill into CalendarView's selectedDay for the full task list.
 *
 * Takes CalendarEntry view-models rather than Tasks (#168) so it renders
 * real tasks and projected (ghost) occurrences identically: recurring
 * entries get a small repeat icon, ghosts are dimmed.
 *
 * Drag & drop (#74): the cell is a drop target and its movable entries
 * (open, non-recurring tasks) can be dragged to another day. The cell is
 * no longer one big button — a stretched button underneath keeps the
 * whole cell clickable with its `aria-label`, and the entries sit above
 * it. Entries are not extra tab stops (up to 3 × 42 cells); keyboard and
 * screen-reader users move tasks via the day view (DateField, → Morgen).
 * While something is dragged, past days show `drop-blocked`, the hovered
 * valid day `drop-target` with its date and a preview row.
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
  acceptsDrop,
  dragEnabled,
}: CalendarDayCellProps) {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id: dropDayId(date), disabled: !acceptsDrop });
  const dragged = active?.data.current as DraggedTask | undefined;
  const dragging = active !== null && dragged !== undefined;
  const isTarget =
    dragging && isOver && acceptsDrop && !(dragged.dueDate && isOnDay(dragged.dueDate, date));

  const visible = entries.slice(0, MAX_VISIBLE_TASKS);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const label = `${date.toLocaleDateString(APP_LOCALE, { weekday: "long", day: "numeric", month: "long" })}${
    isToday ? ", today" : ""
  }, ${entries.length === 0 ? "nothing due" : `${entries.length} ${entries.length === 1 ? "task" : "tasks"}`}`;
  const overflow = entries.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-h-[104px] flex-col gap-1 rounded-box border p-2 transition-colors ${
        isToday ? "border-accent/40" : "border-line"
      } ${weekend ? "bg-transparent" : "bg-base-200"} ${isCurrentMonth ? "" : "opacity-40"} ${
        dragging && !acceptsDrop ? "drop-blocked" : ""
      } ${isTarget ? "drop-target" : ""} ${dragging ? "" : "hover:border-accent/40"}`}
    >
      <button
        type="button"
        onClick={() => onSelect(date)}
        aria-label={label}
        className="absolute inset-0 cursor-pointer rounded-box outline-none! focus-visible:shadow-focus"
      />
      <div className="pointer-events-none relative flex items-start justify-between gap-1">
        <span
          aria-hidden
          className={`inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full px-1 font-mono text-meta ${
            isToday ? "bg-accent font-semibold text-accent-content" : "text-muted"
          }`}
        >
          {date.getDate()}
        </span>
        {isTarget && (
          <span aria-hidden className="truncate font-mono text-[10px] text-accent">
            {formatDropDay(date)}
          </span>
        )}
      </div>
      <div aria-hidden className="pointer-events-none relative flex flex-col gap-1">
        {visible.map((entry) => (
          <CalendarEntryRow
            key={entry.key}
            entry={entry}
            dragEnabled={dragEnabled}
            onSelect={() => onSelect(date)}
          />
        ))}
        {overflow > 0 && (
          <span className="text-[10px] font-medium text-faint">+{overflow} more</span>
        )}
        {isTarget && (
          <div className="drop-preview flex items-center gap-1 px-1 py-0.5 text-xs">
            <PriorityDot priority={dragged.priority} />
            <span className="min-w-0 flex-1 truncate">{dragged.title}</span>
            {dragged.dueDate === null && (
              <span className="flex-shrink-0 font-mono text-[10px]">all-day</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarEntryRow({
  entry,
  dragEnabled,
  onSelect,
}: {
  entry: CalendarEntry;
  dragEnabled: boolean;
  onSelect: () => void;
}) {
  const movable = entry.movableTaskId !== null && dragEnabled;
  // Recurring entries explain why they don't move; both kinds sit above the
  // cell's button, so they open the day on click themselves.
  const blocked = entry.isRecurring && dragEnabled;
  const data: DraggedTask = {
    title: entry.title,
    priority: entry.priority,
    dueDate: entry.dueDate,
    allDay: entry.allDay,
  };
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: dragTaskId(entry.movableTaskId ?? entry.key),
    data,
    disabled: !movable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(movable ? listeners : {})}
      onClick={movable || blocked ? onSelect : undefined}
      title={blocked ? "Recurring — use Skip or edit the series" : undefined}
      className={`flex items-center gap-1 rounded-md px-1 py-px text-xs text-base-content/80 ${
        entry.isGhost ? "opacity-50" : ""
      } ${movable ? "pointer-events-auto cursor-grab touch-none hover:bg-line-strong" : ""} ${
        blocked ? "pointer-events-auto cursor-not-allowed" : ""
      } ${isDragging ? "opacity-30 outline-1 outline-dashed outline-line-strong" : ""}`}
    >
      <PriorityDot priority={entry.priority} />
      {entry.isRecurring && (
        <Repeat size={10} className="flex-shrink-0 text-subtle" aria-hidden="true" />
      )}
      <span
        className={`min-w-0 flex-1 truncate ${
          entry.status === "done" ? "text-faint line-through" : ""
        }`}
      >
        {entry.title}
      </span>
    </div>
  );
}
