"use client";

import type { Task } from "@/lib/types";
import { isTodayOrOverdue } from "@/lib/utils/isDueToday";
import TaskList from "@/components/task/TaskList";

function scopeToTodayOrOverdue(tasks: Task[]): Task[] {
  return tasks.filter(isTodayOrOverdue);
}

/**
 * /today's take on the shared TaskList: scoped to tasks due today (any
 * status) or overdue-and-not-done (see isTodayOrOverdue), with the same
 * status/label filtering and sorting /tasks already offers layered on
 * top (#126).
 */
export default function TodayView() {
  return (
    <TaskList
      baseFilter={scopeToTodayOrOverdue}
      emptyMessage="Nothing due today or overdue — you're all caught up!"
    />
  );
}
