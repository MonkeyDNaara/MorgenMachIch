"use client";

import { useTaskDrawer } from "@/features/tasks/components/drawer/TaskDrawerProvider";
import TaskDrawerPanel from "@/features/tasks/components/drawer/TaskDrawerPanel";
import SideDrawer from "@/components/ui/SideDrawer";

/**
 * Shared create + edit form as a right-side slide-over rather than its own
 * route (#25). Since #440 it is a native modal dialog (SideDrawer): focus
 * moves in on open — the title field for a new task, the dialog itself when
 * editing — stays inside, Escape closes it and focus returns to whatever
 * opened it. The form (TaskDrawerPanel) mounts fresh on every opening.
 */
export default function TaskDrawer() {
  const { state, closeTaskDrawer } = useTaskDrawer();
  const isEditing = state.open && state.taskId !== null;

  return (
    <SideDrawer
      open={state.open}
      onClose={closeTaskDrawer}
      label={isEditing ? "Edit task" : "New task"}
      initialFocus={isEditing ? "dialog" : "field"}
    >
      {state.open && <TaskDrawerPanel taskId={state.taskId} onClose={closeTaskDrawer} />}
    </SideDrawer>
  );
}
