"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type TaskDrawerState = { open: false } | { open: true; taskId: string | null };

type TaskDrawerContextValue = {
  state: TaskDrawerState;
  /** Omit taskId (or pass none) to open in create mode. */
  openTaskDrawer: (taskId?: string) => void;
  closeTaskDrawer: () => void;
};

const TaskDrawerContext = createContext<TaskDrawerContextValue | null>(null);

/**
 * Owns whether the task drawer is open and, if so, whether it's creating a
 * new task or editing an existing one. Lives as its own context (rather
 * than local state on a page) because the drawer must be triggerable from
 * many places — the FAB today, task cards and the command palette later —
 * without prop-drilling through every route.
 */
export function TaskDrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TaskDrawerState>({ open: false });

  const value = useMemo<TaskDrawerContextValue>(
    () => ({
      state,
      openTaskDrawer: (taskId) => setState({ open: true, taskId: taskId ?? null }),
      closeTaskDrawer: () => setState({ open: false }),
    }),
    [state],
  );

  return <TaskDrawerContext.Provider value={value}>{children}</TaskDrawerContext.Provider>;
}

export function useTaskDrawer(): TaskDrawerContextValue {
  const context = useContext(TaskDrawerContext);
  if (!context) {
    throw new Error("useTaskDrawer must be used within a TaskDrawerProvider");
  }
  return context;
}
