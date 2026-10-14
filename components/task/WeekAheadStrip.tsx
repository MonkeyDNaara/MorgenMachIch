"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import type { Task } from "@/lib/types";
import { getTasks } from "@/lib/db/tasks";
import { upcomingWeekDays } from "@/lib/utils/upcomingWeekDays";
import { filterTasksByDay } from "@/lib/utils/filterTasksByDay";
import { formatTime } from "@/lib/utils/formatDueDate";
import { canReschedule, dragTaskId, dropDayId, isOnDay } from "@/lib/utils/reschedule";
import PriorityDot from "@/components/task/PriorityDot";
import type { DraggedTask } from "@/components/dnd/types";
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
 *
 * Drag & drop (#356): every day card is a drop target inside TodayView's
 * DndContext. While a task is dragged, all days show (empty ones as slim
 * dashed targets) so each can be reached; the hovered day gets
 * `drop-target` and a preview row. Strip items can be dragged to another
 * day too (pointer only — like the calendar, they are not tab stops; the
 * card's own button stays the one stop per day).
 */
export default function WeekAheadStrip({ selectedDay, onSelectDay }: WeekAheadStripProps) {
  const tasks = useLiveQuery(() => getTasks(), []);
  const { active } = useDndContext();
  const dragged = active?.data.current as DraggedTask | undefined;
  const days = upcomingWeekDays();

  if (tasks === undefined || days.length === 0) return null;

  const allColumns = days.map((day) => ({ day, tasks: filterTasksByDay(tasks, day) }));
  const dayColumns = dragged ? allColumns : allColumns.filter((column) => column.tasks.length > 0);

  if (dayColumns.length === 0) return null;

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString();

  return (
    <div className="border-t border-line px-6 py-4">
      <p className="mb-3 font-mono text-xs text-faint">Coming up</p>
      {/* Padding + matching negative margin: overflow-x-auto would otherwise
          clip the cards' raised shadow and the focus ring. */}
      <div className="-mx-2 -mt-2 -mb-4 flex gap-3 overflow-x-auto px-2 pt-2 pb-4">
        {dayColumns.map(({ day, tasks: dayTasks }) => (
          <StripDay
            key={day.toDateString()}
            day={day}
            tasks={dayTasks}
            dragged={dragged}
            selected={selectedDay !== null && day.toDateString() === selectedDay.toDateString()}
            // Days without tasks are hidden, so the first card isn't always tomorrow.
            isTomorrow={day.toDateString() === tomorrow}
            onSelect={() => onSelectDay(day)}
          />
        ))}
      </div>
    </div>
  );
}

type StripDayProps = {
  day: Date;
  tasks: Task[];
  dragged: DraggedTask | undefined;
  selected: boolean;
  isTomorrow: boolean;
  onSelect: () => void;
};

function StripDay({ day, tasks, dragged, selected, isTomorrow, onSelect }: StripDayProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dropDayId(day) });
  const isTarget =
    dragged !== undefined && isOver && !(dragged.dueDate && isOnDay(dragged.dueDate, day));
  const empty = tasks.length === 0;
  const visible = tasks.slice(0, MAX_VISIBLE_TASKS);
  const overflow = tasks.length - visible.length;

  // drop-target sets box-shadow, so the raised surface is swapped out while
  // targeted instead of stacked (see design-system.md, Drag & drop).
  const surface = isTarget
    ? "rounded-box border bg-base-300 drop-target"
    : empty
      ? "rounded-box border border-dashed border-line-strong"
      : `surface-raised border ${selected ? "border-accent/50" : "border-transparent hover:border-accent/30"}`;

  return (
    <div
      ref={setNodeRef}
      className={`relative flex w-36 shrink-0 flex-col gap-1.5 p-3 transition-colors ${surface}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${day.toLocaleDateString(APP_LOCALE, { weekday: "long", day: "numeric", month: "long" })}, ${
          tasks.length === 0 ? "nothing open" : `${tasks.length} open`
        }`}
        className="absolute inset-0 cursor-pointer rounded-box outline-none! focus-visible:shadow-focus"
      />
      <p
        aria-hidden
        className={`pointer-events-none relative mb-0.5 flex flex-wrap items-baseline justify-between gap-x-2 pb-1.5 ${
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
      <div aria-hidden className="pointer-events-none relative flex flex-col gap-1">
        {visible.map((task) => (
          <StripTask key={task.id} task={task} onSelect={onSelect} />
        ))}
        {overflow > 0 && (
          <span className="text-[10px] font-medium text-faint">+{overflow} more</span>
        )}
        {isTarget && (
          <div className="drop-preview flex items-center gap-1.5 px-1 py-0.5 text-xs">
            <PriorityDot priority={dragged.priority} />
            <span className="min-w-0 flex-1 truncate">{dragged.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StripTask({ task, onSelect }: { task: Task; onSelect: () => void }) {
  const movable = canReschedule(task);
  const data: DraggedTask = {
    title: task.title,
    priority: task.priority,
    dueDate: task.dueDate,
    allDay: task.allDay,
  };
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: dragTaskId(task.id),
    data,
    disabled: !movable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(movable ? listeners : {})}
      onClick={onSelect}
      title={movable ? undefined : "Recurring — use Skip or edit the series"}
      className={`pointer-events-auto flex items-center gap-1.5 rounded-md px-1 py-px text-xs text-base-content/80 touch-manipulation ${
        movable ? "cursor-grab hover:bg-line-strong" : "cursor-not-allowed"
      } ${isDragging ? "opacity-30 outline-1 outline-dashed outline-line-strong" : ""}`}
    >
      <PriorityDot priority={task.priority} />
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      {!task.allDay && task.dueDate && (
        <span className="flex-shrink-0 text-[10px] text-faint">{formatTime(task.dueDate)}</span>
      )}
    </div>
  );
}
