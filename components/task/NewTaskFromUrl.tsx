"use client";

import { useEffect } from "react";
import { useTaskDrawer } from "@/components/task/TaskDrawerProvider";
import { takeNewTaskParam } from "@/lib/utils/newTaskParam";

/**
 * Opens the task drawer once when the page was launched with ?new=1 (the
 * "New task" shortcut of the installed app, #80), then drops the flag from
 * the URL so a reload or Back doesn't open it again. Reads window.location
 * in an effect instead of useSearchParams, so the page needs no Suspense
 * boundary; history.replaceState is synced with the Next router.
 */
export default function NewTaskFromUrl() {
  const { openTaskDrawer } = useTaskDrawer();

  useEffect(() => {
    const { open, search } = takeNewTaskParam(window.location.search);
    if (!open) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search}${window.location.hash}`,
    );
    openTaskDrawer();
    // Re-runs when openTaskDrawer changes are harmless: the flag is gone by then.
  }, [openTaskDrawer]);

  return null;
}
