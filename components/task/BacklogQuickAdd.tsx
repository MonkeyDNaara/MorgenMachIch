"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { createTask } from "@/lib/db/tasks";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";

type BacklogQuickAddProps = {
  /** True if a task would be visible in the Backlog under the current
   * label/priority filters — used to explain why a just-added task
   * doesn't appear instead of letting it look like the add failed. */
  isVisibleWithFilters: (task: Task) => boolean;
};

/**
 * Inline quick-add at the top of the Backlog column (#184): type a
 * title, press Enter, and a title-only open task with no due date lands
 * in the backlog — no drawer, no other fields. Everything else (priority,
 * labels, notes) can be added later by opening the card, and "Plan for…"
 * (#183) gives it a date.
 *
 * Enter keeps focus and clears the field so several ideas can be
 * dumped in a row; Escape clears without saving. Blank titles are
 * ignored, and a failed save keeps the typed text so nothing is lost.
 */
export default function BacklogQuickAdd({ isVisibleWithFilters }: BacklogQuickAddProps) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const task = await createTask({
        title: trimmed,
        priority: "none",
        dueDate: null,
        allDay: false,
        labelIds: [],
        subtasks: [],
        seriesId: null,
      });
      setTitle("");
      if (!isVisibleWithFilters(task)) {
        setMessage({ kind: "info", text: "Added — hidden by the current filters." });
      }
    } catch {
      setMessage({ kind: "error", text: "Couldn't add this task — try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-3">
      <input
        type="text"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          setMessage(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setTitle("");
            setMessage(null);
          }
        }}
        placeholder="Add to backlog…"
        aria-label="Add a task to the backlog"
        className={`input input-sm w-full ${FIELD_FOCUS}`}
      />
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-1.5 text-xs ${
            message.kind === "error" ? "text-error" : "text-base-content/50"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
