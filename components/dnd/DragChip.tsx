import PriorityDot from "@/features/tasks/components/card/PriorityDot";
import { formatTime } from "@/features/tasks/lib/formatDueDate";
import type { DraggedTask } from "@/components/dnd/types";

/**
 * The small lifted chip that follows the pointer while a task is dragged
 * onto a day (#74, #356): priority dot, title and — for timed tasks — the
 * time it keeps. Rendered inside dnd-kit's `DragOverlay`.
 */
export default function DragChip({ task }: { task: DraggedTask }) {
  return (
    <div className="drag-lifted flex w-max max-w-56 items-center gap-1.5 rounded-field bg-base-300 px-2.5 py-1.5 text-xs">
      <PriorityDot priority={task.priority} />
      <span className="min-w-0 truncate">{task.title}</span>
      {!task.allDay && task.dueDate && (
        <span className="font-mono text-[11px] text-accent">{formatTime(task.dueDate)}</span>
      )}
    </div>
  );
}
