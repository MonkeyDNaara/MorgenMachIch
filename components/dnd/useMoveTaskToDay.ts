"use client";

import { useCallback } from "react";
import type { Task } from "@/lib/types";
import { updateTask } from "@/lib/db/tasks";
import { useToast } from "@/components/layout/ToastProvider";
import { formatDropDay } from "@/lib/utils/dndAnnouncements";
import { canReschedule, isDropDay, isOnDay, moveToDay } from "@/lib/utils/reschedule";

/**
 * Saves a drop of `task` on `day` (#74, #356): keeps the time of day,
 * ignores drops that change nothing or break the rules, and shows
 * "Moved “…” to Thu 15 Oct" with Undo — the same contract as "→ Morgen".
 * Returns whether the task moved.
 */
export function useMoveTaskToDay() {
  const { notify } = useToast();

  return useCallback(
    async (task: Task, day: Date): Promise<boolean> => {
      if (task.dueDate === null || !canReschedule(task)) return false;
      if (!isDropDay(day, new Date()) || isOnDay(task.dueDate, day)) return false;
      const previous = task.dueDate;
      try {
        await updateTask(task.id, { dueDate: moveToDay(previous, task.allDay, day) });
      } catch (error) {
        console.error("Moving the task failed", error);
        notify(`Couldn't move “${task.title}”.`);
        return false;
      }
      notify(`Moved “${task.title}” to ${formatDropDay(day)}`, {
        action: { label: "Undo", onAction: () => updateTask(task.id, { dueDate: previous }) },
      });
      return true;
    },
    [notify],
  );
}
