import type { Label, Task } from "@/lib/types";
import TaskCard from "@/components/task/TaskCard";
import SortableTaskCardList from "@/components/task/SortableTaskCardList";
import DraggableTaskCard from "@/components/task/DraggableTaskCard";
import EmptyState, { type EmptyCopy } from "@/components/layout/EmptyState";

type TaskCardListProps = {
  tasks: Task[];
  labels: Label[];
  /** Shown instead of cards when the list is empty (#243). */
  empty: EmptyCopy;
  /** Smaller empty state for narrow columns. */
  compactEmpty?: boolean;
  /** Show each card's age instead of a due date (the Backlog column, #182). */
  showAge?: boolean;
  /** Show each card's "Plan for…" menu (the Backlog column, #183). */
  showPlan?: boolean;
  /** Makes the list hand-ordered (the Backlog, #73): cards get a grip to
   * drag, a keyboard drag and a move menu; each move is saved here. */
  onReorder?: (id: string, prevId: string | null, nextId: string | null) => Promise<void>;
  /** Cards can be dragged onto day targets of a surrounding DndContext
   * (/today → Coming up, #356); the list itself keeps its order. */
  draggableToDays?: boolean;
};

/**
 * Pure card-list rendering: given already-filtered/sorted tasks, shows
 * either an EmptyState or one TaskCard per task. No fetching, no
 * filter state, no padding of its own — extracted out of TaskList
 * (#62) so TasksView can drive the same card rendering from filter
 * state it lifted up to a shared toolbar (needed so one toolbar filters
 * both the task list and the Recurring column side by side), while
 * TaskList keeps owning its self-contained fetch+filter+toolbar
 * behavior for Today/Calendar, which don't need a shared toolbar.
 */
export default function TaskCardList({
  tasks,
  labels,
  empty,
  compactEmpty = false,
  showAge = false,
  showPlan = false,
  onReorder,
  draggableToDays = false,
}: TaskCardListProps) {
  if (tasks.length === 0) {
    return <EmptyState {...empty} compact={compactEmpty} />;
  }

  if (onReorder) {
    return (
      <SortableTaskCardList
        tasks={tasks}
        labels={labels}
        showAge={showAge}
        showPlan={showPlan}
        onReorder={onReorder}
      />
    );
  }

  if (draggableToDays) {
    return (
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} labels={labels} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} labels={labels} showAge={showAge} showPlan={showPlan} />
      ))}
    </div>
  );
}
