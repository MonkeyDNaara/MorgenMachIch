"use client";

import { useSeriesDrawer } from "@/features/series/components/SeriesDrawerProvider";
import SeriesDrawerPanel from "@/features/series/components/SeriesDrawerPanel";
import SideDrawer from "@/components/ui/SideDrawer";

/**
 * Edit-only slide-over for a recurring series' template (#63), a native
 * modal dialog since #440 (see SideDrawer); focus goes to the dialog itself.
 */
export default function SeriesDrawer() {
  const { state, closeSeriesDrawer } = useSeriesDrawer();

  return (
    <SideDrawer
      open={state.open}
      onClose={closeSeriesDrawer}
      label="Edit series"
      initialFocus="dialog"
    >
      {state.open && <SeriesDrawerPanel seriesId={state.seriesId} onClose={closeSeriesDrawer} />}
    </SideDrawer>
  );
}
