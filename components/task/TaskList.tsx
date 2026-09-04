"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getTasks } from "@/lib/db/tasks";
import TaskCard from "@/components/task/TaskCard";

/**
 * Minimal task list, built ahead of the List View epic just so the drawer
 * has a real UI hook: something to click to open edit mode, so #27
 * (edit), #28 (delete), and #29 (toggle) can each be verified as they're
 * built instead of working blind until a full list view exists. No
 * sorting, filtering, or empty-state polish — the List View epic extends
 * this rather than replacing it.
 *
 * useLiveQuery subscribes directly to the Dexie query, so this re-renders
 * automatically on every create/edit/delete/toggle, anywhere in the app,
 * with no manual refetch wiring.
 */
export default function TaskList() {
  const tasks = useLiveQuery(() => getTasks(), []);

  if (tasks === undefined) {
    return <p className="p-8 text-center text-base-content/40">Loading…</p>;
  }

  if (tasks.length === 0) {
    return (
      <p className="p-8 text-center text-base-content/40">No tasks yet — hit the + button.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-6">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
