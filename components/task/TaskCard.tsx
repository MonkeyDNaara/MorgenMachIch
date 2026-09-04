"use client";

import { Check } from "lucide-react";
import type { Task } from "@/lib/types";
import { updateTask } from "@/lib/db/tasks";
import { formatDueDate, isOverdue } from "@/lib/utils/formatDueDate";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";

type TaskCardProps = {
  task: Task;
};

/**
 * A single task in card form. No priority indicator, label chips, or
 * subtask progress bar yet — those render in once the Priority, Labels,
 * and Subtasks epics build the pieces they need.
 *
 * Two independent click targets live here: the status circle toggles
 * complete/incomplete in place, and the title/date area opens the drawer
 * in edit mode. They're sibling <button>s inside a plain <div> (not a
 * button-in-a-button) since nested buttons are invalid HTML.
 */
export default function TaskCard({ task }: TaskCardProps) {
  const { openTaskDrawer } = useTaskDrawer();
  const done = task.status === "done";
  const overdue = task.dueDate !== null && !done && isOverdue(task.dueDate);

  async function handleToggle() {
    await updateTask(task.id, {
      status: done ? "open" : "done",
      completedAt: done ? null : new Date().toISOString(),
    });
  }

  return (
    <div
      className={`flex w-full items-center gap-3 rounded-box border bg-base-200 p-3 shadow-lg shadow-black/20 transition-colors focus-within:shadow-[0_0_0_3px_rgba(77,209,224,0.35)]! ${
        overdue ? "border-error/50" : "border-transparent"
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={done ? "Mark as incomplete" : "Mark as complete"}
        aria-pressed={done}
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 outline-none! transition-colors ${
          done
            ? "border-primary bg-primary"
            : overdue
              ? "border-error/70 hover:border-error"
              : "border-base-content/30 hover:border-base-content/60"
        }`}
      >
        {done && <Check size={14} className="text-primary-content" />}
      </button>
      <button
        type="button"
        onClick={() => openTaskDrawer(task.id)}
        className="min-w-0 flex-1 text-left outline-none!"
      >
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
      </button>
    </div>
  );
}
