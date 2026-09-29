import type { Label, Task } from "@/lib/types";
import TaskCard from "@/components/task/TaskCard";

type TaskCardListProps = {
  tasks: Task[];
  labels: Label[];
  emptyMessage: string;
};

/**
 * Pure card-list rendering: given already-filtered/sorted tasks, shows
 * either the empty message or one TaskCard per task. No fetching, no
 * filter state, no padding of its own — extracted out of TaskList
 * (#62) so TasksView can drive the same card rendering from filter
 * state it lifted up to a shared toolbar (needed so one toolbar filters
 * both the task list and the Recurring column side by side), while
 * TaskList keeps owning its self-contained fetch+filter+toolbar
 * behavior for Today/Calendar, which don't need a shared toolbar.
 */
export default function TaskCardList({ tasks, labels, emptyMessage }: TaskCardListProps) {
  if (tasks.length === 0) {
    return <p className="p-8 text-center text-base-content/40">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} labels={labels} />
      ))}
    </div>
  );
}
