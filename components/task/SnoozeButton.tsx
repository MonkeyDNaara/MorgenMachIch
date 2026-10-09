"use client";

import { Sunrise } from "lucide-react";
import type { Task } from "@/lib/types";
import { updateTask } from "@/lib/db/tasks";
import { snoozeToTomorrow } from "@/lib/utils/snooze";
import { useToast } from "@/components/layout/ToastProvider";

type SnoozeButtonProps = {
  task: Task;
  /** Overdue cards always show it; otherwise it appears on hover/focus (and always on touch). */
  alwaysVisible: boolean;
};

/**
 * "→ Morgen" (#239): moves an open task to tomorrow, keeping its time of
 * day, then shows a toast with Undo that restores the previous due date.
 * The card decides when it is offered (open, non-recurring, due today or
 * overdue).
 */
export default function SnoozeButton({ task, alwaysVisible }: SnoozeButtonProps) {
  const { notify } = useToast();

  async function handleSnooze() {
    if (task.dueDate === null) return;
    const previous = task.dueDate;
    await updateTask(task.id, {
      dueDate: snoozeToTomorrow(previous, task.allDay, new Date()),
    });
    notify(`Moved “${task.title}” to tomorrow`, {
      action: { label: "Undo", onAction: () => updateTask(task.id, { dueDate: previous }) },
    });
  }

  return (
    <button
      type="button"
      onClick={() => void handleSnooze()}
      aria-label="Move to tomorrow"
      title="Move to tomorrow"
      className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-line-strong px-2.5 text-xs text-primary shadow-raised-sm outline-none! transition-[opacity,color] hover:text-base-content focus-visible:opacity-100 focus-visible:shadow-focus ${
        alwaysVisible
          ? ""
          : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      }`}
    >
      <Sunrise size={13} strokeWidth={2} />
      Morgen
    </button>
  );
}
