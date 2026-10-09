import type { Label, Task } from "@/lib/types";
import TaskCard from "@/components/task/TaskCard";
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
}: TaskCardListProps) {
  if (tasks.length === 0) {
    return <EmptyState {...empty} compact={compactEmpty} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} labels={labels} showAge={showAge} showPlan={showPlan} />
      ))}
    </div>
  );
}
