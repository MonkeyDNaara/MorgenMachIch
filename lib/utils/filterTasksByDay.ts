import type { Task } from "@/lib/types";
import { isSameLocalDay } from "@/lib/utils/isDueToday";

/**
 * Open tasks due on the given local date — used by the week-ahead
 * strip's per-day preview (#130). Deliberately open-only: the strip is
 * a compact glance at what's still to do, not a full day view (that's
 * TodayView's selectedDay drill-down, which shows every status).
 */
export function filterTasksByDay(tasks: Task[], date: Date): Task[] {
  return tasks.filter(
    (task) => task.status === "open" && task.dueDate !== null && isSameLocalDay(task.dueDate, date),
  );
}
