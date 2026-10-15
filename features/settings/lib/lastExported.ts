const STORAGE_KEY = "morgenmachich:lastExportedAt";
const CHANGE_EVENT = "morgenmachich:lastExportedAt-changed";

/**
 * When the user last exported a backup, kept in localStorage — a
 * per-browser convenience only (it drives the Settings nudge), never data
 * the app depends on. Every access is wrapped in try/catch because
 * storage can be blocked or throw (private windows, cleared site data).
 *
 * Shaped for React's useSyncExternalStore: `subscribe` covers this tab
 * (custom event) and other tabs (the native "storage" event).
 */
export function readLastExportedAt(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeLastExportedAt(iso: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    // Storage unavailable — the nudge just keeps showing; nothing breaks.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeLastExportedAt(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
