"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { getTaskSeries, updateTaskSeriesAndRegenerate } from "@/lib/db/taskSeries";
import { getLabels } from "@/lib/db/labels";
import { buildDueDateIso, splitDueDateIso } from "@/lib/utils/dueDate";
import { computeMonthlyDefaults } from "@/lib/utils/recurrence";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";
import type { Priority, RecurrenceRule, Subtask } from "@/lib/types";
import LabelChip from "@/components/label/LabelChip";
import SubtaskEditor from "@/components/task/SubtaskEditor";
import PrioritySelector from "@/components/task/PrioritySelector";
import RecurrenceRuleBuilder from "@/components/task/RecurrenceRuleBuilder";

type SeriesDrawerPanelProps = {
  seriesId: string;
  onClose: () => void;
};

type LoadState = "loading" | "ready" | "not-found";

/**
 * The series-edit form (#63) — mounted fresh by SeriesDrawer on every
 * open, same pattern as TaskDrawerPanel. Edits the template only
 * (title, priority, notes, labels, subtasks, time of day, recurrence
 * rule); the anchor date is shown read-only because it fixes which days
 * the recurrence pattern counts from and past occurrences already
 * reflect it. Saving also regenerates the series' open future
 * occurrences (see updateTaskSeriesAndRegenerate).
 */
export default function SeriesDrawerPanel({ seriesId, onClose }: SeriesDrawerPanelProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [notes, setNotes] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [anchorDate, setAnchorDate] = useState("");
  const [startDateIso, setStartDateIso] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>({
    frequency: "weekly",
    interval: 1,
    daysOfWeek: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    getTaskSeries(seriesId).then((series) => {
      if (cancelled) return;
      if (!series) {
        setLoadState("not-found");
        return;
      }
      setTitle(series.title);
      setPriority(series.priority);
      setNotes(series.notes ?? "");
      setLabelIds(series.labelIds);
      setSubtasks(
        series.subtaskTemplate.map((template) => ({
          id: crypto.randomUUID(),
          title: template.title,
          done: false,
        })),
      );
      const { date, time } = splitDueDateIso(series.startDate);
      setAnchorDate(date);
      setStartDateIso(series.startDate);
      setDueTime(time);
      setAllDay(series.allDay);
      setRecurrence(series.recurrence);
      setLoadState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  const labels = useLiveQuery(() => getLabels(), []);

  function toggleLabel(id: string) {
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((labelId) => labelId !== id) : [...prev, id]));
  }

  // Same guard as the task drawer: switching to monthly seeds a valid
  // mode/day (derived from the series' anchor date) so the builder never
  // shows an unset monthly rule.
  function handleRecurrenceChange(rule: RecurrenceRule) {
    if (rule.frequency === "monthly" && rule.monthlyMode === undefined) {
      setRecurrence({ ...rule, monthlyMode: "dayOfMonth", ...computeMonthlyDefaults(startDateIso) });
      return;
    }
    setRecurrence(rule);
  }

  const recurrenceValid = recurrence.frequency !== "weekly" || (recurrence.daysOfWeek?.length ?? 0) > 0;
  const canSave = loadState === "ready" && title.trim().length > 0 && !saving && recurrenceValid;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await updateTaskSeriesAndRegenerate(seriesId, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        priority,
        labelIds,
        subtaskTemplate: subtasks.map((subtask) => ({ title: subtask.title })),
        recurrence,
        // Only the time-of-day changes; the date part stays the original
        // anchor so the recurrence pattern never shifts.
        startDate: buildDueDateIso(anchorDate, dueTime, allDay) ?? startDateIso,
        allDay,
      });
      onClose();
    } catch {
      setSaving(false);
      setError("Couldn't save this series — check the fields and try again.");
    }
  }

  const anchorLabel = anchorDate
    ? new Date(`${anchorDate}T00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Edit series"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-6 border-l border-white/5 bg-base-100 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Series</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-300 text-base-content/60 transition-colors hover:text-base-content disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {loadState === "loading" && <p className="flex-1 text-sm text-base-content/40">Loading series…</p>}

        {loadState === "not-found" && (
          <p className="flex-1 text-sm text-base-content/40">
            This series couldn&apos;t be found — it may have been deleted.
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

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-base-content/60">Priority</span>
              <PrioritySelector value={priority} onChange={setPriority} />
            </div>

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
              <span className="text-xs font-medium text-base-content/60">Subtasks</span>
              <SubtaskEditor subtasks={subtasks} onChange={setSubtasks} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-base-content/60">Labels</span>
              {labels === undefined ? (
                <p className="text-sm text-base-content/40">Loading…</p>
              ) : labels.length === 0 ? (
                <p className="text-sm text-base-content/40">
                  No labels yet —{" "}
                  <Link href="/labels" className="text-primary hover:underline">
                    create one
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => {
                    const selected = labelIds.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        aria-pressed={selected}
                        className={`cursor-pointer rounded-full outline-none! transition-opacity ${
                          selected ? "opacity-100" : "opacity-40 hover:opacity-70"
                        }`}
                      >
                        <LabelChip name={label.name} color={label.color} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-base-content/60">Time</span>
              <div className="flex flex-wrap items-center gap-3">
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
              <p className="text-xs text-base-content/40">Series started {anchorLabel} — the start date can&apos;t be changed.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-base-content/60">Repeat</span>
              <RecurrenceRuleBuilder value={recurrence} onChange={handleRecurrenceChange} />
            </div>

            <p className="rounded-lg bg-base-200 p-3 text-xs text-base-content/50">
              Saving updates every upcoming open occurrence of this series. Completed and skipped ones stay as they
              are.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn btn-ghost btn-sm">
              {loadState === "not-found" ? "Close" : "Cancel"}
            </button>
            {loadState !== "not-found" && (
              <button type="button" onClick={handleSave} disabled={!canSave} className="btn btn-primary btn-sm">
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
