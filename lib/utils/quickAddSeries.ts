import type { NewTaskSeries } from "@/lib/types";
import type { QuickAddResult } from "@/lib/utils/parseQuickAdd";

/**
 * The series a quick-add parse describes (#275), or null when it has no
 * recurrence. Shared by the quick-add bars and the palette so both create
 * exactly what the task drawer would for the same input: the parse's first
 * occurrence is the start date, all-day unless a time was given.
 */
export function seriesFromQuickAdd(result: QuickAddResult): NewTaskSeries | null {
  if (!result.recurrence || !result.dueDate || !result.title) return null;
  return {
    title: result.title,
    priority: result.priority ?? "none",
    labelIds: result.labelIds,
    subtaskTemplate: [],
    recurrence: result.recurrence,
    startDate: result.dueDate,
    allDay: result.allDay,
    active: true,
  };
}
