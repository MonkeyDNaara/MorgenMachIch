"use client";

import { useDraggable } from "@dnd-kit/core";
import { Inbox, SlidersHorizontal } from "lucide-react";
import type { Task } from "@/lib/types";
import { formatTaskAge } from "@/lib/domain/backlog";
import { dragTaskId } from "@/lib/utils/reschedule";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import DragHandle from "@/components/dnd/DragHandle";
import type { DraggedTask } from "@/components/dnd/types";
import EmptyState from "@/components/ui/EmptyState";
import { useTaskDrawer } from "@/features/tasks/components/drawer/TaskDrawerProvider";

type CalendarBacklogTrayProps = {
  /** Backlog tasks after the calendar's filters, in Backlog order. */
  tasks: Task[];
  /** All Backlog tasks, so an empty tray can say "filtered". */
  total: number;
};

/**
 * The Backlog next to the month grid (#357) — the drag version of Plan
 * for…: drop a card on a day (today or later) and it gets an all-day due
 * date there, leaving the Backlog (Undo in the toast sends it back).
 * Compact cards: grip, a priority-ringed circle, title and age; the title
 * opens the drawer. Reordering stays on /tasks. Lives inside CalendarView's
 * DndContext, only at lg+ and only while toggled on.
 */
export default function CalendarBacklogTray({ tasks, total }: CalendarBacklogTrayProps) {
  return (
    <aside aria-label="Backlog" className="surface-panel flex flex-col gap-2 self-start p-3">
      <p className="font-mono text-eyebrow text-subtle uppercase">Backlog · {tasks.length}</p>
      {tasks.length === 0 ? (
        total === 0 ? (
          <EmptyState
            compact
            icon={Inbox}
            title="Backlog is empty."
            hint="Tasks without a date land here."
          />
        ) : (
          <EmptyState
            compact
            icon={SlidersHorizontal}
            title="No backlog tasks match."
            hint="Change or clear the filters."
          />
        )
      ) : (
        tasks.map((task) => <TrayCard key={task.id} task={task} />)
      )}
    </aside>
  );
}

function TrayCard({ task }: { task: Task }) {
  const { openTaskDrawer } = useTaskDrawer();
  const data: DraggedTask = {
    title: task.title,
    priority: task.priority,
    dueDate: null,
    allDay: true,
  };
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: dragTaskId(task.id),
    data,
  });
  const ring = PRIORITY_DOT_COLORS[task.priority];

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-2 rounded-box p-2 focus-within:shadow-focus! ${
        isDragging ? "drop-slot [&>*]:invisible" : "surface-raised"
      }`}
    >
      <DragHandle
        title={task.title}
        handleRef={setActivatorNodeRef}
        dragProps={{ ...attributes, ...listeners }}
        active={isDragging}
      />
      <span
        aria-hidden
        className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-base-content/30 surface-sunken"
        style={ring ? { borderColor: ring } : undefined}
      />
      <button
        type="button"
        onClick={() => openTaskDrawer(task.id)}
        className="min-w-0 flex-1 cursor-pointer text-left outline-none!"
      >
        <span className="block truncate text-sm font-medium">{task.title}</span>
        <span className="block font-mono text-[11px] text-subtle">
          added {formatTaskAge(task.createdAt)}
        </span>
      </button>
    </div>
  );
}
