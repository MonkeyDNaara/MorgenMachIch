import type { Subtask } from "@/lib/types";

type SubtaskProgressBarProps = {
  subtasks: Subtask[];
};

/**
 * Compact subtask progress indicator: a thin fill bar with the
 * "done/total" fraction right next to it, so the at-a-glance bar and
 * the precise count show together rather than choosing one (#134).
 * Renders nothing when there are no subtasks, so a task without any is
 * completely unaffected.
 */
export default function SubtaskProgressBar({ subtasks }: SubtaskProgressBarProps) {
  if (subtasks.length === 0) return null;

  const doneCount = subtasks.filter((subtask) => subtask.done).length;
  const percent = Math.round((doneCount / subtasks.length) * 100);

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-base-300">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <span className="flex-shrink-0 font-mono text-[10px] text-base-content/50">
        {doneCount}/{subtasks.length}
      </span>
    </div>
  );
}
