"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Label, Task } from "@/lib/types";
import TaskCard from "@/features/tasks/components/card/TaskCard";
import DragHandle from "@/components/dnd/DragHandle";
import type { DraggedTask } from "@/components/dnd/types";
import { canReschedule, dragTaskId } from "@/lib/utils/reschedule";

type DraggableTaskCardProps = {
  task: Task;
  labels: Label[];
};

/**
 * A task card that can be dragged onto a day (#356, /today → Coming up):
 * open, non-recurring, dated tasks get a grip; the card itself stays in
 * place (dimmed) while the small `DragChip` follows the pointer. Not
 * sortable — the list's order stays the time order.
 */
export default function DraggableTaskCard({ task, labels }: DraggableTaskCardProps) {
  const movable = canReschedule(task) && task.dueDate !== null;
  const data: DraggedTask = {
    title: task.title,
    priority: task.priority,
    dueDate: task.dueDate,
    allDay: task.allDay,
  };
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: dragTaskId(task.id),
    data,
    disabled: !movable,
  });

  return (
    <div ref={setNodeRef} className={isDragging ? "opacity-40" : undefined}>
      <TaskCard
        task={task}
        labels={labels}
        dragHandle={
          movable ? (
            <DragHandle
              title={task.title}
              handleRef={setActivatorNodeRef}
              dragProps={{ ...attributes, ...listeners }}
              active={isDragging}
            />
          ) : undefined
        }
      />
    </div>
  );
}
