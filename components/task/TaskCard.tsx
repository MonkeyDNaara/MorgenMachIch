"use client";

import { Check, Minus, Repeat, SkipForward } from "lucide-react";
import type { Label, Task } from "@/lib/types";
import { updateTask } from "@/lib/db/tasks";
import { isOverdue } from "@/lib/utils/formatDueDate";
import { dueMeta } from "@/lib/utils/dueMeta";
import { formatTaskAge } from "@/lib/utils/backlog";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";
import LabelChip from "@/components/label/LabelChip";
import SubtaskProgressBar from "@/components/task/SubtaskProgressBar";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import PlanForMenu from "@/components/task/PlanForMenu";

type TaskCardProps = {
  task: Task;
  /** Every label in the app (fetched once by TaskList, not per-card) —
   * this card looks up its own subset via task.labelIds. */
  labels: Label[];
  /** Backlog cards (#182) have no due date to show, so they show how
   * long ago the task was added instead. */
  showAge?: boolean;
  /** Backlog cards also get a "Plan for…" menu (#183) to give the task
   * a due date and move it out of the backlog. */
  showPlan?: boolean;
};

/** At most this many label chips render inline; the rest collapse into
 * a "+N" indicator so a task with many labels can't blow out the row. */
const MAX_VISIBLE_LABELS = 2;

/**
 * A single task in card form.
 *
 * Two independent click targets live here: the status circle toggles
 * complete/incomplete in place, and the title/date area opens the drawer
 * in edit mode. They're sibling <button>s inside a plain <div> (not a
 * button-in-a-button) since nested buttons are invalid HTML.
 *
 * A third action — skip (added for #61) — only appears for recurring
 * occurrences (`seriesId` set) that are still open, sitting in the same
 * flex-shrink-0 group as the label chips on the right. Skipping sets
 * `status: "skipped"`; the card renders it like "done" (muted,
 * line-through) but with a dash in the status circle instead of a
 * checkmark, so it doesn't read as "still open."
 *
 * Priority (added for #138) colors the status circle's ring since #232
 * (green/yellow/red from the theme's success/warning/error), replacing
 * the small dot before the title — distinct from labels, which are
 * categorical tags and stay on the right. "None" keeps the neutral ring.
 *
 * The subtask progress bar (added for #134) lives inside the title/date
 * button, below the date, so it's naturally a third stacked line rather
 * than a separate row competing with the label chips for card height.
 *
 * Label chips (added for #118) sit as a third, flex-shrink-0 item in the
 * same row, pushed right — not a new row, so a task with no labels is
 * unaffected. The title/date button keeps min-w-0 + truncate so it's
 * what yields horizontal space first; the row itself can wrap as a
 * last-resort fallback on a narrow viewport with a long title.
 */
const META_TONE = {
  accent: "text-accent",
  error: "text-error",
  muted: "text-base-content/50",
} as const;

export default function TaskCard({
  task,
  labels,
  showAge = false,
  showPlan = false,
}: TaskCardProps) {
  const { openTaskDrawer } = useTaskDrawer();
  const done = task.status === "done";
  const skipped = task.status === "skipped";
  const overdue =
    task.status === "open" && task.dueDate !== null && isOverdue(task.dueDate, task.allDay);
  const meta = dueMeta(task, new Date());
  const canSkip = task.seriesId !== null && task.status === "open";
  const canPlan = showPlan && task.dueDate === null && task.status === "open";

  const taskLabels = labels.filter((label) => task.labelIds.includes(label.id));
  const visibleLabels = taskLabels.slice(0, MAX_VISIBLE_LABELS);
  const overflowCount = taskLabels.length - visibleLabels.length;

  async function handleToggle() {
    await updateTask(task.id, {
      status: done ? "open" : "done",
      completedAt: done ? null : new Date().toISOString(),
    });
  }

  async function handleSkip() {
    await updateTask(task.id, { status: "skipped" });
  }

  // Priority lives on the checkbox ring (#232) instead of a dot before the
  // title; overdue keeps its red ring, done/skipped tasks drop the color.
  const priorityRing = !done && !skipped && !overdue ? PRIORITY_DOT_COLORS[task.priority] : null;

  return (
    <div
      className={`flex w-full flex-wrap items-center gap-3 rounded-box border p-3 transition-colors focus-within:shadow-focus! ${
        done || skipped
          ? "border-line bg-transparent"
          : `surface-raised ${overdue ? "border-error/50" : "border-transparent"}`
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={done ? "Mark as incomplete" : "Mark as complete"}
        aria-pressed={done}
        className={`flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-2 outline-none! transition-colors ${
          done
            ? "border-transparent bg-line-strong"
            : skipped
              ? "border-base-content/20"
              : overdue
                ? "surface-sunken border-error/70 hover:border-error"
                : priorityRing
                  ? "surface-sunken hover:brightness-125"
                  : "surface-sunken border-base-content/30 hover:border-base-content/60"
        }`}
        style={priorityRing ? { borderColor: priorityRing } : undefined}
      >
        {done && <Check size={14} className="text-base-content/70" />}
        {skipped && <Minus size={14} className="text-base-content/40" />}
      </button>
      <button
        type="button"
        onClick={() => openTaskDrawer(task.id)}
        className="min-w-0 flex-1 cursor-pointer text-left outline-none!"
      >
        <span
          className={`block truncate text-body font-medium ${
            done || skipped ? "text-base-content/50 line-through decoration-base-content/30" : ""
          }`}
        >
          {task.title}
        </span>
        {(meta || showAge || task.seriesId) && (
          <span className="mt-1 flex items-center gap-1.5 font-mono text-meta">
            {meta && <span className={META_TONE[meta.tone]}>{meta.text}</span>}
            {!meta && showAge && (
              <span className="text-base-content/50">added {formatTaskAge(task.createdAt)}</span>
            )}
            {task.seriesId && (
              <Repeat size={12} aria-label="Recurring" className="text-base-content/40" />
            )}
          </span>
        )}
        <SubtaskProgressBar subtasks={task.subtasks} />
      </button>
      {(taskLabels.length > 0 || canSkip || canPlan) && (
        <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
          {visibleLabels.map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} size="sm" />
          ))}
          {overflowCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-line-strong px-2 py-0.5 text-[10px] font-medium text-base-content/60">
              +{overflowCount}
            </span>
          )}
          {canSkip && (
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Skip this occurrence"
              title="Skip this occurrence"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-base-content/40 outline-none! transition-colors hover:bg-line-strong hover:text-base-content/70"
            >
              <SkipForward size={14} />
            </button>
          )}
          {canPlan && <PlanForMenu task={task} />}
        </div>
      )}
    </div>
  );
}
