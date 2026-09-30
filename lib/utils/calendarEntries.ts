import type { Priority, Task, TaskStatus } from "@/lib/types";
import type { GhostOccurrence } from "@/lib/utils/projectOccurrences";

/**
 * What one line in a /calendar day cell needs to render (#168) — a
 * deliberately small view-model so CalendarDayCell doesn't care whether
 * an entry is a real task or a projected (ghost) occurrence.
 */
export type CalendarEntry = {
  key: string;
  title: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  isRecurring: boolean;
  isGhost: boolean;
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
    status: task.status,
    dueDate: task.dueDate,
    isRecurring: task.seriesId !== null,
    isGhost: false,
  };
}

export function ghostToEntry(ghost: GhostOccurrence): CalendarEntry {
  return {
    key: `ghost-${ghost.seriesId}-${ghost.dueDate}`,
    title: ghost.title,
    priority: ghost.priority,
    status: "open",
    dueDate: ghost.dueDate,
    isRecurring: true,
    isGhost: true,
  };
}
