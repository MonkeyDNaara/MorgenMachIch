"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";

/** Routes where "add a task" makes sense. Labels/Settings aren't about
 * tasks, so the FAB would be a dead end (or confusing) there. */
const TASK_ROUTES = ["/today", "/tasks", "/calendar"];

/** Floating "+" button — opens the task drawer in create mode (no
 * taskId). Below md it sits above the tab bar (#235), from md up in the
 * bottom-right corner — back on desktop since #254 as the quickest way
 * to the full drawer. Hidden outside task-related routes. */
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
      className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-content shadow-gloss transition-transform hover:scale-105 md:right-6 md:bottom-6"
    >
      <Plus size={22} strokeWidth={2.4} />
    </button>
  );
}
