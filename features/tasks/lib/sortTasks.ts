import type { Task } from "@/lib/types";

export type TaskSortBy = "dueDate" | "createdAt";

/**
 * Sorts tasks for /tasks.
 *
 * "dueDate": ascending, tasks with no due date sort last — an undated
 * task isn't more urgent than a dated one, so it shouldn't jump to the
 * front. "createdAt": newest first.
 *
 * Priority is deliberately not a sort option yet — every task is
 * priority: "none" until the Priority epic ships a selector, so sorting
 * by it would be a no-op today.
 *
 * dueDate/createdAt are ISO 8601 strings, so a plain string compare is
 * already chronological order — no Date parsing needed.
 */
export function sortTasks(tasks: Task[], sortBy: TaskSortBy): Task[] {
  const sorted = [...tasks];
  if (sortBy === "dueDate") {
    sorted.sort((a, b) => {
      if (a.dueDate === null && b.dueDate === null) return 0;
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  } else {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return sorted;
}
