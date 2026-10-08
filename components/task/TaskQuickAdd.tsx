"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { createTask } from "@/lib/db/tasks";
import { formatQuickAddDue } from "@/lib/utils/formatQuickAddDue";
import type { QuickAddResult } from "@/lib/utils/parseQuickAdd";
import QuickAddInput from "@/components/quickadd/QuickAddInput";

/** Why a just-added task can't be seen where it was added. */
export type QuickAddVisibility = "visible" | "out-of-scope" | "filtered";

type TaskQuickAddProps = {
  /** Due day for text without a date (all-day), or null for the backlog. */
  defaultDate: Date | null;
  /** Where the page would show the task, so the field can say when it won't. */
  visibilityOf: (task: Task) => QuickAddVisibility;
  placeholder?: string;
};

/**
 * The page-level quick-add bar (#205) on /today and /tasks: a
 * QuickAddInput that creates the task. Text without a date gets the
 * page's default — today (or the day drilled into on /today) or the
 * backlog on /tasks — and the field shows that default as a hint.
 *
 * Successful adds are silent when the task appears right there; when it
 * doesn't (another day, the hidden Backlog column, or the current
 * filters), a short note says where it went so it never looks like the
 * add failed. The note clears on the next edit.
 */
export default function TaskQuickAdd({
  defaultDate,
  visibilityOf,
  placeholder = "Add a task… e.g. “Call mom fri 3pm #family !high”",
}: TaskQuickAddProps) {
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const defaultIso = defaultDate
    ? new Date(
        defaultDate.getFullYear(),
        defaultDate.getMonth(),
        defaultDate.getDate(),
      ).toISOString()
    : null;
  const defaultHint = defaultIso ? formatQuickAddDue(defaultIso, true, new Date()) : "Backlog";

  async function handleSubmit(result: QuickAddResult) {
    setMessage(null);
    const dueDate = result.dueDate ?? defaultIso;
    let task: Task;
    try {
      task = await createTask({
        title: result.title,
        priority: result.priority ?? "none",
        dueDate,
        allDay: result.dueDate ? result.allDay : dueDate !== null,
        labelIds: result.labelIds,
        subtasks: [],
        seriesId: null,
      });
    } catch (error) {
      setMessage({ kind: "error", text: "Couldn't add this task — try again." });
      throw error; // keeps the typed text in the field
    }

    const visibility = visibilityOf(task);
    if (visibility === "visible") return;
    const where = task.dueDate
      ? `for ${formatQuickAddDue(task.dueDate, task.allDay, new Date())}`
      : "to the backlog";
    setMessage({
      kind: "info",
      text:
        visibility === "filtered"
          ? `Added ${where} — hidden by the current filters.`
          : `Added ${where} — not shown here.`,
    });
  }

  return (
    <div>
      <QuickAddInput
        onSubmit={handleSubmit}
        defaultHint={defaultHint}
        placeholder={placeholder}
        ariaLabel="Quick add a task"
        onEdit={() => setMessage(null)}
      />
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-1.5 text-xs ${message.kind === "error" ? "text-error" : "text-base-content/50"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
