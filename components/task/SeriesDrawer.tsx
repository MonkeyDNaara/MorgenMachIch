"use client";

import { useSeriesDrawer } from "@/components/task/SeriesDrawerProvider";
import SeriesDrawerPanel from "@/components/task/SeriesDrawerPanel";

/** Edit-only slide-over for a recurring series' template (#63). */
export default function SeriesDrawer() {
  const { state, closeSeriesDrawer } = useSeriesDrawer();

  if (!state.open) return null;

  return <SeriesDrawerPanel seriesId={state.seriesId} onClose={closeSeriesDrawer} />;
}
