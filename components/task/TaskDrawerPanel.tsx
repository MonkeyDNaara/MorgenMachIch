"use client";

import { useState } from "react";
import { X } from "lucide-react";

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

  const isEditing = taskId !== null;

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
              className="input w-full bg-base-200"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-base-content/60">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Add notes (Markdown supported)…"
              className="textarea w-full bg-base-200"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-base-content/60">Due date</span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="input bg-base-200"
              />
              <input
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
                disabled={allDay}
                className="input bg-base-200 disabled:opacity-40"
              />
              <label className="ml-auto flex items-center gap-2 text-sm text-base-content/70">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(event) => setAllDay(event.target.checked)}
                  className="checkbox checkbox-sm"
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
            <button type="button" disabled className="btn btn-primary btn-sm">
              Save
            </button>
          </div>
          <p className="text-right text-xs text-base-content/40">
            Saving lands in the next issue.
          </p>
        </div>
      </aside>
    </>
  );
}
