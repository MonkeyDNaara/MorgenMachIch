"use client";

import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";
import TaskDrawerPanel from "@/components/task/TaskDrawerPanel";

/**
 * Shared create + edit form, shown as a right-side slide-over rather than
 * its own route. This issue (#25) only builds the shell and the core
 * fields (title, notes, due date/time, all-day) — see TaskDrawerPanel.
 * Priority selection and the subtask editor are intentionally left out;
 * they're added directly into TaskDrawerPanel by the Priority and
 * Subtasks epics once the UI pieces those epics build actually exist.
 *
 * Saving isn't wired up yet: #26 (create) and #27 (edit, incl. prefill)
 * connect the form to lib/db.
 */
export default function TaskDrawer() {
  const { state, closeTaskDrawer } = useTaskDrawer();

  if (!state.open) return null;

  return <TaskDrawerPanel taskId={state.taskId} onClose={closeTaskDrawer} />;
}
