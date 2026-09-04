"use client";

import { Plus } from "lucide-react";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";

/** Floating "+" button from the approved mockup — the primary way to
 * create a task. Opens the drawer in create mode (no taskId). */
export default function AddTaskFab() {
  const { openTaskDrawer } = useTaskDrawer();

  return (
    <button
      type="button"
      onClick={() => openTaskDrawer()}
      aria-label="Add task"
      className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-content shadow-lg shadow-primary/40 transition-transform hover:scale-105"
    >
      <Plus size={22} strokeWidth={2.4} />
    </button>
  );
}
