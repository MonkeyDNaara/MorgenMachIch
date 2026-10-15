"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Repeat,
  SlidersHorizontal,
} from "lucide-react";
import type { Task } from "@/lib/types";
import { getTasks } from "@/lib/db/tasks";
import { listTaskSeries } from "@/lib/db/taskSeries";
import { getLabels } from "@/lib/db/labels";
import { getMonthGrid } from "@/lib/date/monthGrid";
import { groupTasksByDate, dateKey } from "@/lib/domain/groupTasksByDate";
import { isSameLocalDay } from "@/features/tasks/lib/isDueToday";
import { filterTasksByLabels } from "@/features/tasks/lib/filterTasksByLabels";
import {
  filterTasksByPriority,
  type PriorityFilter,
} from "@/features/tasks/lib/filterTasksByPriority";
import { projectSeriesOccurrences } from "@/features/series/lib/projectOccurrences";
import { ghostToEntry, hasDueDate, taskToEntry } from "@/features/calendar/lib/calendarEntries";
import TaskList from "@/features/tasks/components/list/TaskList";
import CalendarDayCell from "@/features/calendar/components/CalendarDayCell";
import CalendarBacklogTray from "@/features/calendar/components/CalendarBacklogTray";
import DragChip from "@/features/dnd/components/DragChip";
import type { DraggedTask } from "@/features/dnd/types";
import { useMoveTaskToDay } from "@/features/dnd/hooks/useMoveTaskToDay";
import { useAppSensors } from "@/features/dnd/hooks/useAppSensors";
import { createDayAnnouncements } from "@/features/dnd/lib/announcements";
import { LG_UP, MD_UP, REDUCED_MOTION, useMediaQuery } from "@/hooks/useMediaQuery";
import { dayCollision } from "@/features/dnd/lib/dayCollision";
import { dayKeyboardCoordinates } from "@/features/dnd/lib/dayKeyboardCoordinates";
import { calendarBacklogVisible } from "@/features/backlog/lib/backlogVisible";
import { isBacklogTask, sortBacklogTasks } from "@/lib/domain/backlog";
import { DAY_DRAG_INSTRUCTIONS } from "@/features/dnd/lib/dndAnnouncements";
import { isDropDay, parseDragTaskId, parseDropDayId } from "@/features/dnd/lib/reschedule";
import ProjectedOccurrenceList from "@/features/series/components/ProjectedOccurrenceList";
import FilterPopover from "@/features/tasks/components/list/FilterPopover";
import PageHeader from "@/components/ui/PageHeader";
import { APP_LOCALE } from "@/lib/constants/locale";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function scopeToSelectedDay(day: Date) {
  return (tasks: Task[]) =>
    tasks.filter((task) => task.dueDate !== null && isSameLocalDay(task.dueDate, day));
}

/**
 * /calendar's month view (#145). Two states, same selectedDay pattern
 * as TodayView: the month grid by default, or — once a day cell is
 * clicked — the shared TaskList scoped to that exact date (any status,
 * matching TodayView's day drill-down convention) with a "Back to
 * month" control to return to the grid.
 *
 * Tasks are fetched once and bucketed by local day via
 * groupTasksByDate rather than filtered per cell, since the grid can
 * have up to ~42 cells.
 *
 * Recurring occurrences are ordinary Task rows, so they show up like any
 * other task — but rows only exist ~60 days ahead. Beyond that, the
 * visible grid also gets read-only projected "ghost" occurrences
 * computed from the active series (#168, projectSeriesOccurrences) so
 * a series doesn't look like it ended; nothing is written to the DB.
 *
 * Label (multi, OR) and priority (single) filters live here (#171) and
 * apply to the grid, its projected occurrences, and the day drill-down
 * alike — one filter bar above both states, with TaskList's own
 * label/priority controls hidden in the day view so there is only one
 * source of truth. Plain state, resets on reload, like the other filters.
 *
 * Drag & drop (#74): open, non-recurring tasks can be dragged from one day
 * cell to another (from `md` up). The time of day is kept, past days don't
 * accept drops, and a toast offers Undo — the same contract as "→ Morgen".
 * At `lg` a "Backlog · N" pill opens a tray beside the grid (#357): its
 * cards drop onto a day as all-day tasks (keyboard: grip, Space, arrows
 * day by day, Space). The tray's visibility is remembered per browser.
 *
 * The week-view toggle is a separate stretch issue (#145).
 */
export default function CalendarView() {
  const tasks = useLiveQuery(() => getTasks(), []);
  const series = useLiveQuery(() => listTaskSeries(), []);
  const labels = useLiveQuery(() => getLabels(), []);
  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dragged, setDragged] = useState<DraggedTask | null>(null);
  const dndId = useId();
  const moveTaskToDay = useMoveTaskToDay();
  // Pointer dragging only from md up: the cells are ~45 px wide on phones.
  const dragEnabled = useMediaQuery(MD_UP);
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const sensors = useAppSensors({
    pointer: dragEnabled,
    coordinateGetter: dayKeyboardCoordinates,
  });
  // The Backlog tray (#357): lg+ only, toggled and remembered per browser.
  const lgUp = useMediaQuery(LG_UP);
  const trayOn = useSyncExternalStore(
    calendarBacklogVisible.subscribe,
    calendarBacklogVisible.read,
    () => false,
  );

  function toggleLabelFilter(labelId: string) {
    setActiveLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  }

  /** Same label + priority filtering for real tasks and ghosts. */
  function applyFilters<T extends { labelIds: string[]; priority: Task["priority"] }>(
    items: T[],
  ): T[] {
    return filterTasksByLabels(filterTasksByPriority(items, priority), activeLabelIds);
  }

  // One Filter popover in the header for both the grid and the day view
  // (#236), so there is still a single source of truth for the filters.
  const filterControl = (
    <FilterPopover
      labels={labels ?? []}
      activeLabelIds={activeLabelIds}
      onToggleLabel={toggleLabelFilter}
      priority={priority}
      onPriorityChange={setPriority}
      onClear={() => {
        setActiveLabelIds([]);
        setPriority("all");
      }}
    />
  );

  function goToPrevMonth() {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(prev.getFullYear());
    setViewMonth(prev.getMonth());
  }

  function goToNextMonth() {
    const next = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToCurrentMonth() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function findTask(dragId: string | number) {
    const id = parseDragTaskId(dragId);
    return id === null ? undefined : tasks?.find((task) => task.id === id);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDragged((active.data.current as DraggedTask | undefined) ?? null);
  }

  /** Moves the task to the day it was dropped on (#74), keeping its time,
   * with an Undo toast like "→ Morgen" (see useMoveTaskToDay). */
  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragged(null);
    const task = findTask(active.id);
    const day = over ? parseDropDayId(over.id) : null;
    if (task && day) void moveTaskToDay(task, day);
  }

  const grid = getMonthGrid(viewYear, viewMonth, today);
  const ghosts =
    tasks && series
      ? projectSeriesOccurrences(series, tasks, grid[0].date, grid[grid.length - 1].date, today)
      : [];

  if (selectedDay) {
    const dayGhosts = applyFilters(ghosts).filter((ghost) =>
      isSameLocalDay(ghost.dueDate, selectedDay),
    );
    const filtersActive = priority !== "all" || activeLabelIds.length > 0;
    const label = selectedDay.toLocaleDateString(APP_LOCALE, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    return (
      <div className="flex flex-col">
        <PageHeader
          className="px-6 pt-8 pb-6"
          eyebrow="Calendar"
          title={label}
          actions={
            <>
              {filterControl}
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="btn btn-ghost btn-xs cursor-pointer text-muted"
              >
                Back to month
              </button>
            </>
          }
        />
        <TaskList
          baseFilter={(allTasks) => applyFilters(scopeToSelectedDay(selectedDay)(allTasks))}
          hideLabelAndPriorityFilters
          empty={
            dayGhosts.length > 0
              ? {
                  icon: Repeat,
                  title: `No tasks generated for ${label} yet.`,
                  hint: "The projected occurrences below appear as tasks closer to the day.",
                }
              : filtersActive
                ? {
                    icon: SlidersHorizontal,
                    title: `No matching tasks for ${label}.`,
                    hint: "Change or clear the filters to see more.",
                  }
                : {
                    icon: CalendarDays,
                    title: `Nothing due ${label}.`,
                    hint: "A free day — add a task with the + button.",
                  }
          }
        />
        <ProjectedOccurrenceList ghosts={dayGhosts} />
      </div>
    );
  }

  if (tasks === undefined || series === undefined) {
    return <p className="p-8 text-center text-faint">Loading…</p>;
  }

  // Skipped occurrences are hidden from the grid (added for #61) — this
  // bucketing path doesn't go through TaskList's status filter, so it
  // needs its own exclusion. Real entries first, ghosts after.
  const entriesByDate = groupTasksByDate([
    ...applyFilters(tasks.filter((task) => task.status !== "skipped"))
      .filter(hasDueDate)
      .map(taskToEntry),
    ...applyFilters(ghosts).map(ghostToEntry),
  ]);
  const backlogTasks = tasks.filter(isBacklogTask);
  const showTray = lgUp && trayOn;

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(APP_LOCALE, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        className="px-6 pt-8 pb-6"
        eyebrow="Calendar"
        title={monthLabel}
        actions={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => calendarBacklogVisible.write(!trayOn)}
              aria-pressed={trayOn}
              className={`mr-1 hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium outline-none! transition-colors focus-visible:shadow-focus lg:flex ${
                trayOn
                  ? "bg-base-300 text-base-content shadow-raised-sm"
                  : "text-muted hover:bg-line hover:text-base-content"
              }`}
            >
              <Inbox size={14} />
              Backlog · {backlogTasks.length}
            </button>
            <div className="mr-2">{filterControl}</div>
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label="Previous month"
              className="btn btn-ghost btn-xs cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToCurrentMonth}
              className="btn btn-ghost btn-xs cursor-pointer text-muted"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Next month"
              className="btn btn-ghost btn-xs cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />
      <div className="flex flex-col gap-4 p-6">
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={dayCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragged(null)}
          accessibility={{
            announcements: createDayAnnouncements(
              (id) => findTask(id)?.title ?? "task",
              (id) => {
                const day = parseDropDayId(id);
                return day ? { day, allowed: isDropDay(day, today) } : null;
              },
            ),
            screenReaderInstructions: { draggable: DAY_DRAG_INSTRUCTIONS },
          }}
        >
          <div
            className={
              showTray ? "grid grid-cols-[minmax(0,1fr)_15rem] items-start gap-4" : undefined
            }
          >
            <div className="flex min-w-0 flex-col gap-4">
              <div
                aria-hidden
                className="grid grid-cols-7 gap-1.5 px-2 font-mono text-eyebrow text-subtle uppercase"
              >
                {WEEKDAY_LABELS.map((label, index) => (
                  <span key={label} className={index >= 5 ? "text-base-content/30" : undefined}>
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {grid.map(({ date, isCurrentMonth, isToday }) => (
                  <CalendarDayCell
                    key={date.toDateString()}
                    date={date}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday}
                    entries={entriesByDate.get(dateKey(date)) ?? []}
                    onSelect={setSelectedDay}
                    acceptsDrop={isDropDay(date, today)}
                    dragEnabled={dragEnabled}
                  />
                ))}
              </div>
            </div>
            {showTray && (
              <CalendarBacklogTray
                tasks={sortBacklogTasks(applyFilters(backlogTasks))}
                total={backlogTasks.length}
              />
            )}
          </div>
          <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
            {dragged && <DragChip task={dragged} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
