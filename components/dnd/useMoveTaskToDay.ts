"use client";

import { useCallback } from "react";
import type { Task } from "@/lib/types";
import { updateTask } from "@/lib/db/tasks";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDropDay } from "@/lib/utils/dndAnnouncements";
import { canReschedule, isDropDay, isOnDay, moveToDay } from "@/lib/utils/reschedule";
import { planDueDateIso, toLocalDateKey } from "@/lib/date/planDateOptions";

/**
 * Saves a drop of `task` on `day` (#74, #356): keeps the time of day,
 * ignores drops that change nothing or break the rules, and shows
 * "Moved “…” to Thu 15 Oct" with Undo — the same contract as "→ Morgen".
 * A backlog task (no due date, #357) is planned instead: an all-day date
 * like Plan for…, "Planned “…” for Thu 15 Oct", and Undo sends it back
 * to the Backlog. Returns whether the task moved.
 */
export function useMoveTaskToDay() {
  const { notify } = useToast();

  return useCallback(
    async (task: Task, day: Date): Promise<boolean> => {
      if (!canReschedule(task) || !isDropDay(day, new Date())) return false;
      const previous = { dueDate: task.dueDate, allDay: task.allDay };
      if (previous.dueDate !== null && isOnDay(previous.dueDate, day)) return false;
      const next =
        previous.dueDate === null
          ? { dueDate: planDueDateIso(toLocalDateKey(day)), allDay: true }
          : { dueDate: moveToDay(previous.dueDate, task.allDay, day) };
      try {
        await updateTask(task.id, next);
      } catch (error) {
        console.error("Moving the task failed", error);
        notify(`Couldn't move “${task.title}”.`);
        return false;
      }
      const verb = previous.dueDate === null ? "Planned" : "Moved";
      const preposition = previous.dueDate === null ? "for" : "to";
      notify(`${verb} “${task.title}” ${preposition} ${formatDropDay(day)}`, {
        action: { label: "Undo", onAction: () => updateTask(task.id, previous) },
      });
      return true;
    },
    [notify],
  );
}
