"use client";

import { useId, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useLiveQuery } from "dexie-react-hooks";
import type { Task } from "@/lib/types";
import { getTasks } from "@/lib/db/tasks";
import { dayProgress } from "@/features/today/lib/dayProgress";
import { isTodayOrOverdue, isSameLocalDay } from "@/features/tasks/lib/isDueToday";
import TaskList from "@/features/tasks/components/list/TaskList";
import WeekAheadStrip from "@/features/today/components/WeekAheadStrip";
import TaskQuickAdd from "@/features/quick-add/components/TaskQuickAdd";
import StreakBadge from "@/features/stats/components/StreakBadge";
import PageHeader from "@/components/ui/PageHeader";
import DayProgress from "@/features/today/components/DayProgress";
import { CalendarDays, CalendarRange, Flag, History, Sunrise } from "lucide-react";
import type { EmptyCopy } from "@/components/ui/EmptyState";
import { APP_LOCALE } from "@/lib/constants/locale";
import DragChip from "@/features/dnd/components/DragChip";
import type { DraggedTask } from "@/features/dnd/types";
import { useMoveTaskToDay } from "@/features/dnd/hooks/useMoveTaskToDay";
import { useAppSensors } from "@/features/dnd/hooks/useAppSensors";
import { dayKeyboardCoordinates } from "@/features/dnd/lib/dayKeyboardCoordinates";
import { dayCollision } from "@/features/dnd/lib/dayCollision";
import { createDayAnnouncements } from "@/features/dnd/lib/announcements";
import { REDUCED_MOTION, useMediaQuery } from "@/hooks/useMediaQuery";
import { DAY_DRAG_INSTRUCTIONS } from "@/features/dnd/lib/dndAnnouncements";
import { isDropDay, parseDragTaskId, parseDropDayId } from "@/features/dnd/lib/reschedule";
import DashboardBand from "@/features/dashboard/components/DashboardBand";
import WidgetPlaceholder from "@/features/dashboard/components/WidgetPlaceholder";

const TASKS_ID = "today-tasks";
const QUICK_ADD_ID = "today-quick-add";

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
 *
 * Drag & drop (#356): the list and the Coming up strip share one
 * DndContext. Open, non-recurring cards have a grip; dropping one on a
 * strip day moves it there (time kept, Undo toast — useMoveTaskToDay).
 * With the keyboard, Space/Enter on the grip picks it up, arrows jump from
 * day to day, Space/Enter drops, Escape cancels.
 *
 * Dashboard (#421, epic #419): the briefing band (DashboardBand) sits above
 * the task area on desktop; on mobile its cards stack around it (Important →
 * tasks → the rest) via CSS order. The band is about today, so it is hidden
 * while another day is drilled into.
 */
export default function TodayView() {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const tasks = useLiveQuery(() => getTasks(), []);
  const now = new Date();
  const dndId = useId();
  const sensors = useAppSensors({ coordinateGetter: dayKeyboardCoordinates });
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const moveTaskToDay = useMoveTaskToDay();
  const [dragged, setDragged] = useState<DraggedTask | null>(null);

  function findTask(dragId: string | number) {
    const id = parseDragTaskId(dragId);
    return id === null ? undefined : tasks?.find((task) => task.id === id);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDragged((active.data.current as DraggedTask | undefined) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragged(null);
    const task = findTask(active.id);
    const day = over ? parseDropDayId(over.id) : null;
    if (task && day) void moveTaskToDay(task, day);
  }

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
            className="btn btn-ghost btn-xs cursor-pointer text-muted"
          >
            Back to Today
          </button>
        </div>
      )}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={dayCollision}
        // Empty strip days only mount once a drag starts, so keep measuring.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragged(null)}
        accessibility={{
          announcements: createDayAnnouncements(
            (id) => findTask(id)?.title ?? "task",
            (id) => {
              const day = parseDropDayId(id);
              return day ? { day, allowed: isDropDay(day, new Date()) } : null;
            },
          ),
          screenReaderInstructions: { draggable: DAY_DRAG_INSTRUCTIONS },
        }}
      >
        <div className="flex flex-col">
          {!selectedDay && (
            <DashboardBand
              quickAddId={QUICK_ADD_ID}
              tasksId={TASKS_ID}
              important={
                <WidgetPlaceholder
                  title="Important"
                  copy={{
                    icon: Flag,
                    title: "Nothing flagged yet.",
                    hint: "Urgent tasks for today will collect here.",
                  }}
                />
              }
              widgets={[
                {
                  id: "yesterday",
                  node: (
                    <WidgetPlaceholder
                      title="Yesterday"
                      copy={{
                        icon: History,
                        title: "No look back yet.",
                        hint: "What got done and what slipped will show here.",
                      }}
                    />
                  ),
                },
                {
                  id: "this-week",
                  node: (
                    <WidgetPlaceholder
                      title="This week"
                      copy={{
                        icon: CalendarRange,
                        title: "No week numbers yet.",
                        hint: "Done per day and your on-time rate will show here.",
                      }}
                    />
                  ),
                },
              ]}
            />
          )}
          <section
            id={TASKS_ID}
            aria-label="Today's tasks"
            className="order-2 flex flex-col md:order-none"
          >
            <TaskList
              baseFilter={baseFilter}
              empty={empty}
              draggableToDays
              header={(visibilityOf) => (
                <TaskQuickAdd
                  defaultDate={selectedDay ?? new Date()}
                  visibilityOf={visibilityOf}
                  inputId={QUICK_ADD_ID}
                />
              )}
            />
            <WeekAheadStrip selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          </section>
        </div>
        <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
          {dragged && <DragChip task={dragged} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
