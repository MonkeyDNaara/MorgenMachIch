"use client";

import type { Task } from "@/lib/types";
import { formatDueDate, isOverdue } from "@/lib/utils/formatDueDate";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";

type TaskCardProps = {
  task: Task;
};

/**
 * A single task in card form. No priority indicator, label chips, or
 * subtask progress bar yet — those render in once the Priority, Labels,
 * and Subtasks epics build the pieces they need. The circular status
 * indicator is decorative for now; wiring it up to actually toggle
 * complete/incomplete is #29. Clicking anywhere on the card opens the
 * drawer in edit mode.
 */
export default function TaskCard({ task }: TaskCardProps) {
  const { openTaskDrawer } = useTaskDrawer();
  const done = task.status === "done";
  const overdue = task.dueDate !== null && !done && isOverdue(task.dueDate);

  return (
    <button
      type="button"
      onClick={() => openTaskDrawer(task.id)}
      className="flex w-full items-center gap-3 rounded-box bg-base-200 p-3 text-left shadow-lg shadow-black/20 transition-colors hover:bg-base-300"
    >
      <span
        aria-hidden="true"
        className={`h-6 w-6 flex-shrink-0 rounded-full border-2 ${
          done ? "border-primary bg-primary" : "border-base-content/30"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-medium ${
            done ? "text-base-content/50 line-through" : ""
          }`}
        >
          {task.title}
        </span>
        {task.dueDate && (
          <span
            className={`mt-1 block font-mono text-xs ${
              overdue ? "text-error" : "text-base-content/50"
            }`}
          >
            {formatDueDate(task.dueDate, task.allDay)}
            {overdue ? " · overdue" : ""}
          </span>
        )}
      </span>
    </button>
  );
}
