"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createTask } from "@/lib/db/tasks";
import { buildDueDateIso } from "@/lib/utils/dueDate";

/**
 * DaisyUI's default input focus (a colored border plus a separate 2px
 * outline offset from it) reads as two overlapping rings. This replaces
 * that with a single soft cyan glow — the same treatment as the FAB's
 * shadow — by driving daisyUI's own --input-color variable directly and
 * swapping the outline for a diffused shadow.
 */
const FIELD_FOCUS =
  "bg-base-200 outline-none! [--input-color:var(--color-base-300)] " +
  "focus:[--input-color:var(--color-primary)]! " +
  "focus:shadow-[0_0_0_4px_rgba(77,209,224,0.25)]!";

type TaskDrawerPanelProps = {
  /** null = create mode. #27 will use this to load + prefill the task. */
  taskId: string | null;
  onClose: () => void;
};

/**
 * The actual form, split out from TaskDrawer so it only exists while the
 * drawer is open — mounted fresh by TaskDrawer each time, unmounted on
 * close. That gives every open a clean slate for free, with no effect
 * needed to reset fields between opens.
 */
export default function TaskDrawerPanel({ taskId, onClose }: TaskDrawerPanelProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = taskId !== null;
  // Editing an existing task isn't wired up until #27 — Save stays
  // disabled in that case for now.
  const canSave = !isEditing && title.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await createTask({
        title: title.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        priority: "none",
        dueDate: buildDueDateIso(dueDate, dueTime, allDay),
        allDay,
        labelIds: [],
        subtasks: [],
        seriesId: null,
      });
      onClose();
    } catch {
      setSaving(false);
      setError("Couldn't save this task — check the fields and try again.");
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit task" : "New task"}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-6 border-l border-white/5 bg-base-100 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEditing ? "Edit Task" : "New Task"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-300 text-base-content/60 transition-colors hover:text-base-content"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-base-content/60">Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to be done?"
              className={`input w-full ${FIELD_FOCUS}`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-base-content/60">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Add notes (Markdown supported)…"
              className={`textarea w-full ${FIELD_FOCUS}`}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-base-content/60">Due date</span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={`input ${FIELD_FOCUS}`}
              />
              <input
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
                disabled={allDay}
                className={`input disabled:opacity-40 ${FIELD_FOCUS}`}
              />
              <label className="ml-auto flex items-center gap-2 text-sm text-base-content/70">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(event) => setAllDay(event.target.checked)}
                  className="checkbox checkbox-sm checkbox-primary"
                />
                All day
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="btn btn-primary btn-sm"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {error && <p className="text-right text-xs text-error">{error}</p>}
          {isEditing && !error && (
            <p className="text-right text-xs text-base-content/40">
              Editing lands in the next issue.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
