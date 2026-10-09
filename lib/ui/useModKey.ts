"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  // The platform never changes while the page is open.
  return () => {};
}

function getSnapshot(): string {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

/**
 * The modifier key to show in shortcut hints: "⌘" on Apple devices,
 * "Ctrl" elsewhere (#235). Read through useSyncExternalStore so the
 * server render ("Ctrl") and the browser value never cause a hydration
 * mismatch. Shared by the sidebar search button and the palette footer.
 */
export function useModKey(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => "Ctrl");
}
