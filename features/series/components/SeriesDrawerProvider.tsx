"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SeriesDrawerState = { open: false } | { open: true; seriesId: string };

type SeriesDrawerContextValue = {
  state: SeriesDrawerState;
  openSeriesDrawer: (seriesId: string) => void;
  closeSeriesDrawer: () => void;
};

const SeriesDrawerContext = createContext<SeriesDrawerContextValue | null>(null);

/**
 * Owns whether the series-edit drawer is open and which series it's
 * editing (#63). Mirrors TaskDrawerProvider, but edit-only — there's no
 * create mode because new series are created through the task drawer's
 * "Repeat" toggle.
 */
export function SeriesDrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SeriesDrawerState>({ open: false });

  const value = useMemo<SeriesDrawerContextValue>(
    () => ({
      state,
      openSeriesDrawer: (seriesId) => setState({ open: true, seriesId }),
      closeSeriesDrawer: () => setState({ open: false }),
    }),
    [state],
  );

  return <SeriesDrawerContext.Provider value={value}>{children}</SeriesDrawerContext.Provider>;
}

export function useSeriesDrawer(): SeriesDrawerContextValue {
  const context = useContext(SeriesDrawerContext);
  if (!context) {
    throw new Error("useSeriesDrawer must be used within a SeriesDrawerProvider");
  }
  return context;
}
