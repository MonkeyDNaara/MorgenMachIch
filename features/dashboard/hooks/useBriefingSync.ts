"use client";

import { useEffect } from "react";
import {
  applyBriefingCollapsed,
  briefingCollapsed,
} from "@/features/dashboard/lib/briefingCollapsed";

/** Follows a collapse toggled in another tab (the native "storage" event). */
export function useBriefingSync(): void {
  useEffect(
    () => briefingCollapsed.subscribe(() => applyBriefingCollapsed(briefingCollapsed.read())),
    [],
  );
}
