"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getTasks } from "@/lib/db/tasks";
import { getLabels } from "@/lib/db/labels";
import { filterTasksByLabels } from "@/lib/utils/filterTasksByLabels";
import TaskCard from "@/components/task/TaskCard";
import LabelFilterBar from "@/components/task/LabelFilterBar";

/**
 * Minimal task list, built ahead of the List View epic just so the drawer
 * has a real UI hook: something to click to open edit mode, so #27
 * (edit), #28 (delete), and #29 (toggle) can each be verified as they're
 * built instead of working blind until a full list view exists. No
 * sorting or empty-state polish beyond the filter states below — the
 * List View epic extends this rather than replacing it.
 *
 * useLiveQuery subscribes directly to the Dexie query, so this re-renders
 * automatically on every create/edit/delete/toggle, anywhere in the app,
 * with no manual refetch wiring.
 *
 * Labels are fetched once here (not per-card) and passed down, so N
 * cards don't each open their own identical live query (added for #118).
 *
 * Label filter state (added for #120) is plain component state — resets
 * on reload/navigation, no persistence, matching the rest of the app's
 * UI state today.
 */
export default function TaskList() {
  const tasks = useLiveQuery(() => getTasks(), []);
  const labels = useLiveQuery(() => getLabels(), []);
  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([]);

  function toggleLabelFilter(labelId: string) {
    setActiveLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  }

  if (tasks === undefined) {
    return <p className="p-8 text-center text-base-content/40">Loading…</p>;
  }

  if (tasks.length === 0) {
    return (
      <p className="p-8 text-center text-base-content/40">No tasks yet — hit the + button.</p>
    );
  }

  const filteredTasks = filterTasksByLabels(tasks, activeLabelIds);

  return (
    <div className="flex flex-col">
      <LabelFilterBar
        labels={labels ?? []}
        activeLabelIds={activeLabelIds}
        onToggle={toggleLabelFilter}
        onClear={() => setActiveLabelIds([])}
      />
      {filteredTasks.length === 0 ? (
        <p className="p-8 text-center text-base-content/40">
          No tasks match the selected labels.
        </p>
      ) : (
        <div className="flex flex-col gap-2 p-6">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} labels={labels ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
