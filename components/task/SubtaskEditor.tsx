"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type { Subtask } from "@/lib/types";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";

type SubtaskEditorProps = {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
};

/**
 * Add/remove/reorder/toggle editor for a task's subtasks, rendered
 * inside TaskDrawerPanel. Fully controlled — every edit calls onChange
 * with the next array; no internal subtasks state, so TaskDrawerPanel
 * stays the single source of truth (same pattern as its labelIds
 * state). Reordering is plain up/down swaps, not drag-and-drop — that's
 * left to the Drag & Drop epic (#133).
 */
export default function SubtaskEditor({ subtasks, onChange }: SubtaskEditorProps) {
  const [newTitle, setNewTitle] = useState("");

  function updateSubtask(id: string, patch: Partial<Subtask>) {
    onChange(subtasks.map((subtask) => (subtask.id === id ? { ...subtask, ...patch } : subtask)));
  }

  function removeSubtask(id: string) {
    onChange(subtasks.filter((subtask) => subtask.id !== id));
  }

  function moveSubtask(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= subtasks.length) return;
    const next = [...subtasks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  function addSubtask() {
    const title = newTitle.trim();
    if (!title) return;
    onChange([...subtasks, { id: crypto.randomUUID(), title, done: false }]);
    setNewTitle("");
  }

  return (
    <div className="flex flex-col gap-2">
      {subtasks.map((subtask, index) => (
        <div key={subtask.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={subtask.done}
            onChange={(event) => updateSubtask(subtask.id, { done: event.target.checked })}
            className="checkbox checkbox-sm checkbox-primary"
          />
          <input
            type="text"
            value={subtask.title}
            onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })}
            className={`input input-sm min-w-0 flex-1 ${FIELD_FOCUS} ${
              subtask.done ? "text-base-content/40 line-through" : ""
            }`}
          />
          <button
            type="button"
            onClick={() => moveSubtask(index, -1)}
            disabled={index === 0}
            aria-label="Move up"
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-base-content/40 outline-none! hover:text-base-content disabled:cursor-not-allowed disabled:opacity-20"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => moveSubtask(index, 1)}
            disabled={index === subtasks.length - 1}
            aria-label="Move down"
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-base-content/40 outline-none! hover:text-base-content disabled:cursor-not-allowed disabled:opacity-20"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => removeSubtask(subtask.id)}
            aria-label="Remove subtask"
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-base-content/40 outline-none! hover:text-error"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSubtask();
            }
          }}
          placeholder="Add a subtask…"
          className={`input input-sm min-w-0 flex-1 ${FIELD_FOCUS}`}
        />
        <button
          type="button"
          onClick={addSubtask}
          disabled={newTitle.trim().length === 0}
          aria-label="Add subtask"
          className="btn btn-ghost btn-sm btn-square cursor-pointer disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
