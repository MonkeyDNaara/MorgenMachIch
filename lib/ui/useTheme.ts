"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  readResolvedTheme,
  readThemePreference,
  subscribeResolvedTheme,
  subscribeThemePreference,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/ui/themePreference";

/** The stored choice; "system" on the server and during hydration. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribeThemePreference, readThemePreference, () => "system");
}

/**
 * The theme on screen plus a toggle to the other one (#266). `null` on
 * the server and during hydration, because the server can't know the OS
 * setting or localStorage — callers render a neutral state for it.
 */
export function useResolvedTheme(): {
  theme: ResolvedTheme | null;
  toggle: () => void;
} {
  const theme = useSyncExternalStore<ResolvedTheme | null>(
    subscribeResolvedTheme,
    readResolvedTheme,
    () => null,
  );
  const toggle = useCallback(() => {
    writeThemePreference(readResolvedTheme() === "dark" ? "light" : "dark");
  }, []);
  return { theme, toggle };
}
