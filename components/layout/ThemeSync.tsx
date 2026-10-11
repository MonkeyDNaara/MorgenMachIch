"use client";

import { useEffect } from "react";
import {
  applyThemePreference,
  readThemePreference,
  subscribeThemePreference,
} from "@/lib/ui/themePreference";

/**
 * Keeps the page's theme in step with the stored preference (#266). The
 * inline head script already set it before the first paint; this applies
 * it once more after hydration (the theme-color metas may not have
 * existed yet when that script ran) and again whenever another tab
 * changes it. Renders nothing, like OccurrenceSync.
 */
export default function ThemeSync() {
  useEffect(() => {
    const apply = () => applyThemePreference(readThemePreference());
    apply();
    return subscribeThemePreference(apply);
  }, []);
  return null;
}
