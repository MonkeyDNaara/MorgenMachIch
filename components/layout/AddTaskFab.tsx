"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";

/** Routes where "add a task" makes sense. Labels/Settings aren't about
 * tasks, so the FAB would be a dead end (or confusing) there. */
const TASK_ROUTES = ["/today", "/tasks", "/calendar"];

/** Floating "+" button from the approved mockup — the primary way to
 * create a task. Opens the drawer in create mode (no taskId). Hidden
 * outside task-related routes. */
export default function AddTaskFab() {
  const pathname = usePathname();
  const { openTaskDrawer } = useTaskDrawer();

  const showFab = TASK_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (!showFab) return null;

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
