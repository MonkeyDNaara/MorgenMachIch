import type { Priority } from "@/lib/types";

/** What a task carries on `data.current` while it is dragged onto a day
 * (calendar #74, Coming up #356, Backlog tray #357). */
export type DraggedTask = {
  title: string;
  priority: Priority;
  /** Null for a backlog task — it gets an all-day date on drop. */
  dueDate: string | null;
  allDay: boolean;
};
