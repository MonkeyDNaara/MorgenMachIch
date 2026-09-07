"use client";

import { Check } from "lucide-react";
import type { Label, Task } from "@/lib/types";
import { updateTask } from "@/lib/db/tasks";
import { formatDueDate, isOverdue } from "@/lib/utils/formatDueDate";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";
import LabelChip from "@/components/label/LabelChip";

type TaskCardProps = {
  task: Task;
  /** Every label in the app (fetched once by TaskList, not per-card) —
   * this card looks up its own subset via task.labelIds. */
  labels: Label[];
};

/** At most this many label chips render inline; the rest collapse into
 * a "+N" indicator so a task with many labels can't blow out the row. */
const MAX_VISIBLE_LABELS = 2;

/**
 * A single task in card form. No priority indicator or subtask progress
 * bar yet — those render in once the Priority and Subtasks epics build
 * the pieces they need.
 *
 * Two independent click targets live here: the status circle toggles
 * complete/incomplete in place, and the title/date area opens the drawer
 * in edit mode. They're sibling <button>s inside a plain <div> (not a
 * button-in-a-button) since nested buttons are invalid HTML.
 *
 * Label chips (added for #118) sit as a third, flex-shrink-0 item in the
 * same row, pushed right — not a new row, so a task with no labels is
 * unaffected. The title/date button keeps min-w-0 + truncate so it's
 * what yields horizontal space first; the row itself can wrap as a
 * last-resort fallback on a narrow viewport with a long title.
 */
export default function TaskCard({ task, labels }: TaskCardProps) {
  const { openTaskDrawer } = useTaskDrawer();
  const done = task.status === "done";
  const overdue = task.dueDate !== null && !done && isOverdue(task.dueDate);

  const taskLabels = labels.filter((label) => task.labelIds.includes(label.id));
  const visibleLabels = taskLabels.slice(0, MAX_VISIBLE_LABELS);
  const overflowCount = taskLabels.length - visibleLabels.length;

  async function handleToggle() {
    await updateTask(task.id, {
      status: done ? "open" : "done",
      completedAt: done ? null : new Date().toISOString(),
    });
  }

  return (
    <div
      className={`flex w-full flex-wrap items-center gap-3 rounded-box border bg-base-200 p-3 shadow-lg shadow-black/20 transition-colors focus-within:shadow-[0_0_0_3px_rgba(77,209,224,0.35)]! ${
        overdue ? "border-error/50" : "border-transparent"
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={done ? "Mark as incomplete" : "Mark as complete"}
        aria-pressed={done}
        className={`flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-2 outline-none! transition-colors ${
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
        className="min-w-0 flex-1 cursor-pointer text-left outline-none!"
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
      {taskLabels.length > 0 && (
        <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
          {visibleLabels.map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} size="sm" />
          ))}
          {overflowCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-base-300 px-2 py-0.5 text-[10px] font-medium text-base-content/60">
              +{overflowCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
