"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createTask, getTask, updateTask } from "@/lib/db/tasks";
import { buildDueDateIso, splitDueDateIso } from "@/lib/utils/dueDate";

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
  /** null = create mode. Otherwise the id of the task being edited. */
  taskId: string | null;
  onClose: () => void;
};

type LoadState = "loading" | "ready" | "not-found";

/**
 * The actual form, split out from TaskDrawer so it only exists while the
 * drawer is open — mounted fresh by TaskDrawer each time, unmounted on
 * close. That gives every open a clean slate for free, with no effect
 * needed to reset fields between opens (only to load an existing task in
 * edit mode, which is a legitimate use of an effect).
 */
export default function TaskDrawerPanel({ taskId, onClose }: TaskDrawerPanelProps) {
  const isEditing = taskId !== null;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(isEditing ? "loading" : "ready");

  // Load the existing task once, in edit mode only. Create mode has
  // nothing to fetch, so it starts (and stays) "ready".
  useEffect(() => {
    if (!isEditing) return;

    let cancelled = false;
    getTask(taskId).then((task) => {
      if (cancelled) return;
      if (!task) {
        setLoadState("not-found");
        return;
      }
      setTitle(task.title);
      setNotes(task.notes ?? "");
      const { date, time } = splitDueDateIso(task.dueDate);
      setDueDate(date);
      setDueTime(time);
      setAllDay(task.allDay);
      setLoadState("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [isEditing, taskId]);

  const canSave = loadState === "ready" && title.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (isEditing) {
        // Only the fields this drawer actually edits — priority, labels,
        // subtasks, and status are deliberately left out of the patch so
        // editing never clobbers them with drawer defaults. updateTask
        // merges with the existing record, so they stay untouched.
        await updateTask(taskId, {
          title: title.trim(),
          notes: notes.trim() || undefined,
          dueDate: buildDueDateIso(dueDate, dueTime, allDay),
          allDay,
        });
      } else {
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
      }
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

        {loadState === "loading" && (
          <p className="flex-1 text-sm text-base-content/40">Loading task…</p>
        )}

        {loadState === "not-found" && (
          <p className="flex-1 text-sm text-base-content/40">
            This task couldn&apos;t be found — it may have been deleted.
          </p>
        )}

        {loadState === "ready" && (
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
        )}

        <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
              {loadState === "not-found" ? "Close" : "Cancel"}
            </button>
            {loadState !== "not-found" && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="btn btn-primary btn-sm"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
          {error && <p className="text-right text-xs text-error">{error}</p>}
        </div>
      </aside>
    </>
  );
}
