"use client";

import { useState } from "react";
import type { Label, Task } from "@/lib/types";
import { createTask } from "@/lib/db/tasks";
import { formatQuickAddDue } from "@/lib/utils/formatQuickAddDue";
import type { QuickAddResult } from "@/lib/utils/parseQuickAdd";
import QuickAddInput from "@/components/quickadd/QuickAddInput";
import { useAddSeries } from "@/components/quickadd/useAddSeries";
import { newLabelsNote, withNewLabels } from "@/components/quickadd/newLabels";
import { useToast } from "@/components/layout/ToastProvider";

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
 *
 * Text with a recurrence ("Gym every mon 7am", #275) creates a series
 * instead, confirmed by a toast with Undo (useAddSeries); the note rule is
 * the same, checked against the series' first occurrence.
 */
export default function TaskQuickAdd({
  defaultDate,
  visibilityOf,
  placeholder = "Add a task… e.g. “Call mom fri 3pm #family !high”",
}: TaskQuickAddProps) {
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const addSeries = useAddSeries();
  const { notify } = useToast();

  const defaultIso = defaultDate
    ? new Date(
        defaultDate.getFullYear(),
        defaultDate.getMonth(),
        defaultDate.getDate(),
      ).toISOString()
    : null;
  const defaultHint = defaultIso ? formatQuickAddDue(defaultIso, true, new Date()) : "Backlog";

  async function handleSeries(result: QuickAddResult) {
    try {
      const series = await addSeries(result);
      if (!series) return;
      // Would the first occurrence (on /today) or the series row (on /tasks,
      // a task with a seriesId) show up here? Same check as for tasks.
      const first: Task = {
        id: "",
        title: series.title,
        status: "open",
        priority: series.priority,
        dueDate: series.startDate,
        allDay: series.allDay,
        labelIds: series.labelIds,
        subtasks: [],
        seriesId: series.id,
        createdAt: series.createdAt,
        updatedAt: series.updatedAt,
        completedAt: null,
      };
      const visibility = visibilityOf(first);
      if (visibility === "visible") return;
      const when = formatQuickAddDue(series.startDate, series.allDay, new Date());
      setMessage({
        kind: "info",
        text:
          visibility === "filtered"
            ? `Series added — hidden by the current filters.`
            : `Series added — first on ${when}, not shown here.`,
      });
    } catch (error) {
      setMessage({ kind: "error", text: "Couldn't add this series — try again." });
      throw error; // keeps the typed text in the field
    }
  }

  async function handleSubmit(result: QuickAddResult) {
    setMessage(null);
    if (result.recurrence) return handleSeries(result);
    const dueDate = result.dueDate ?? defaultIso;
    let task: Task;
    let created: Label[];
    try {
      // Unknown #tags become labels first (#283).
      const resolved = await withNewLabels(result);
      created = resolved.created;
      task = await createTask({
        title: result.title,
        priority: result.priority ?? "none",
        dueDate,
        allDay: result.dueDate ? result.allDay : dueDate !== null,
        labelIds: resolved.result.labelIds,
        subtasks: [],
        seriesId: null,
      });
    } catch (error) {
      setMessage({ kind: "error", text: "Couldn't add this task — try again." });
      throw error; // keeps the typed text in the field
    }
    // Normal adds stay silent; a created label is worth a toast (typos!).
    if (created.length > 0) notify(`Added “${task.title}”${newLabelsNote(created)}`);

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
        recurrence
        newLabels
      />
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-1.5 text-xs ${message.kind === "error" ? "text-error" : "text-subtle"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
