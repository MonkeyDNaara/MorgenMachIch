"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Plus } from "lucide-react";
import { countTasksWithLabel, createLabel, deleteLabel, getLabels, updateLabel } from "@/lib/db/labels";
import { DEFAULT_LABEL_COLOR, type LabelColorHex } from "@/lib/constants/labelColors";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";
import type { Label } from "@/lib/types";
import LabelChip from "@/components/label/LabelChip";
import ColorSwatchPicker from "@/components/label/ColorSwatchPicker";

type FormMode = { kind: "none" } | { kind: "create" } | { kind: "edit"; label: Label };

/**
 * Labels management page: list, create, edit, delete. Repository layer
 * (lib/db/labels.ts) already validates and persists — this is UI only.
 *
 * useLiveQuery subscribes directly to Dexie, same pattern as TaskList,
 * so the list re-renders on every create/edit/delete with no manual
 * refetch wiring.
 */
export default function LabelsView() {
  const labels = useLiveQuery(() => getLabels(), []);

  const [form, setForm] = useState<FormMode>({ kind: "none" });
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColorHex>(DEFAULT_LABEL_COLOR);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [affectedCount, setAffectedCount] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Auto-revert the "really delete?" confirm state after a few seconds,
  // same pattern as the task drawer's delete confirm (#28).
  useEffect(() => {
    if (!confirmingDeleteId) return;
    const timer = setTimeout(() => setConfirmingDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmingDeleteId]);

  function openCreate() {
    setForm({ kind: "create" });
    setName("");
    setColor(DEFAULT_LABEL_COLOR);
    setFormError(null);
  }

  function openEdit(label: Label) {
    setForm({ kind: "edit", label });
    setName(label.name);
    setColor(label.color as LabelColorHex);
    setFormError(null);
  }

  function closeForm() {
    setForm({ kind: "none" });
    setFormError(null);
  }

  const canSave = name.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave || form.kind === "none") return;
    setSaving(true);
    setFormError(null);
    try {
      if (form.kind === "create") {
        await createLabel({ name: name.trim(), color });
      } else {
        await updateLabel(form.label.id, { name: name.trim(), color });
      }
      setSaving(false);
      closeForm();
    } catch {
      setSaving(false);
      setFormError("Couldn't save this label — try again.");
    }
  }

  async function handleDeleteClick(label: Label) {
    if (deletingId) return;
    if (confirmingDeleteId !== label.id) {
      const count = await countTasksWithLabel(label.id);
      setAffectedCount(count);
      setConfirmingDeleteId(label.id);
      return;
    }
    setDeletingId(label.id);
    setDeleteError(null);
    try {
      await deleteLabel(label.id);
      if (form.kind === "edit" && form.label.id === label.id) closeForm();
    } catch {
      setDeleteError("Couldn't delete this label — try again.");
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  }

  const sortedLabels = [...(labels ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Labels</h1>
        {form.kind === "none" && (
          <button type="button" onClick={openCreate} className="btn btn-primary btn-sm gap-1">
            <Plus size={14} />
            New label
          </button>
        )}
      </div>

      {form.kind === "create" && (
        <LabelForm
          heading="New label"
          name={name}
          color={color}
          onNameChange={setName}
          onColorChange={setColor}
          onSave={handleSave}
          onCancel={closeForm}
          saving={saving}
          canSave={canSave}
          error={formError}
        />
      )}

      {labels === undefined && <p className="text-sm text-base-content/40">Loading…</p>}

      {labels !== undefined && labels.length === 0 && form.kind !== "create" && (
        <p className="text-sm text-base-content/40">
          No labels yet — create one to start tagging tasks.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sortedLabels.map((label) =>
          form.kind === "edit" && form.label.id === label.id ? (
            <LabelForm
              key={label.id}
              heading="Edit label"
              name={name}
              color={color}
              onNameChange={setName}
              onColorChange={setColor}
              onSave={handleSave}
              onCancel={closeForm}
              saving={saving}
              canSave={canSave}
              error={formError}
            />
          ) : (
            <div
              key={label.id}
              className="flex items-center justify-between gap-3 rounded-box bg-base-200 p-3"
            >
              <LabelChip name={label.name} color={label.color} />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(label)}
                  disabled={form.kind !== "none" || deletingId !== null}
                  aria-label={`Edit ${label.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-base-content/60 transition-colors outline-none! hover:text-base-content disabled:opacity-40"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(label)}
                  disabled={form.kind !== "none" || (deletingId !== null && deletingId !== label.id)}
                  className={`btn btn-xs ${
                    confirmingDeleteId === label.id ? "btn-error" : "btn-ghost text-error"
                  }`}
                >
                  {deletingId === label.id
                    ? "Deleting…"
                    : confirmingDeleteId === label.id
                      ? affectedCount === 0
                        ? "Really delete?"
                        : `Remove from ${affectedCount} task${affectedCount === 1 ? "" : "s"}?`
                      : "Delete"}
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {deleteError && <p className="text-xs text-error">{deleteError}</p>}
    </div>
  );
}

type LabelFormProps = {
  heading: string;
  name: string;
  color: LabelColorHex;
  onNameChange: (value: string) => void;
  onColorChange: (value: LabelColorHex) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  canSave: boolean;
  error: string | null;
};

/** Shared inline form for both create and edit — only the heading and
 * which repository call handleSave makes actually differ. */
function LabelForm({
  heading,
  name,
  color,
  onNameChange,
  onColorChange,
  onSave,
  onCancel,
  saving,
  canSave,
  error,
}: LabelFormProps) {
  return (
    <div className="flex flex-col gap-4 rounded-box border border-white/5 bg-base-200 p-4">
      <span className="text-xs font-medium text-base-content/60">{heading}</span>
      <input
        type="text"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="Label name"
        className={`input w-full ${FIELD_FOCUS}`}
      />
      <ColorSwatchPicker value={color} onChange={onColorChange} />
      <div className="flex items-center justify-end gap-2">
        {error && <p className="mr-auto text-xs text-error">{error}</p>}
        <button type="button" onClick={onCancel} disabled={saving} className="btn btn-ghost btn-sm">
          Cancel
        </button>
        <button type="button" onClick={onSave} disabled={!canSave} className="btn btn-primary btn-sm">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
