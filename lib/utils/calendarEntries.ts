import type { Priority, Task, TaskStatus } from "@/lib/types";
import type { GhostOccurrence } from "@/lib/utils/projectOccurrences";
import { canReschedule } from "@/lib/utils/reschedule";

/**
 * What one line in a /calendar day cell needs to render (#168) — a
 * deliberately small view-model so CalendarDayCell doesn't care whether
 * an entry is a real task or a projected (ghost) occurrence.
 */
export type CalendarEntry = {
  key: string;
  title: string;
  priority: Priority;
  labelIds: string[];
  status: TaskStatus;
  dueDate: string;
  allDay: boolean;
  isRecurring: boolean;
  isGhost: boolean;
  /** The task id when this entry may be dragged to another day (#74):
   * a real, open, non-recurring task. Null for occurrences and ghosts. */
  movableTaskId: string | null;
};

/** Tasks without a due date never reach the calendar, so callers
 * narrow first (see `hasDueDate`) instead of this casting. */
export function hasDueDate(task: Task): task is Task & { dueDate: string } {
  return task.dueDate !== null;
}

export function taskToEntry(task: Task & { dueDate: string }): CalendarEntry {
  return {
    key: task.id,
    title: task.title,
    priority: task.priority,
    labelIds: task.labelIds,
    status: task.status,
    dueDate: task.dueDate,
    allDay: task.allDay,
    isRecurring: task.seriesId !== null,
    isGhost: false,
    movableTaskId: canReschedule(task) ? task.id : null,
  };
}

export function ghostToEntry(ghost: GhostOccurrence): CalendarEntry {
  return {
    key: `ghost-${ghost.seriesId}-${ghost.dueDate}`,
    title: ghost.title,
    priority: ghost.priority,
    labelIds: ghost.labelIds,
    status: "open",
    dueDate: ghost.dueDate,
    allDay: ghost.allDay,
    isRecurring: true,
    isGhost: true,
    movableTaskId: null,
  };
}
