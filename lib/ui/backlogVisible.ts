const STORAGE_KEY = "morgenmachich:backlogVisible";
const CHANGE_EVENT = "morgenmachich:backlogVisible-changed";

/**
 * Whether /tasks shows the Backlog column (#182), kept in localStorage —
 * a per-browser convenience, never data the app depends on. Defaults to
 * visible, and every access is wrapped in try/catch because storage can
 * be blocked or throw (private windows, cleared site data).
 *
 * Shaped for React's useSyncExternalStore, same pattern as
 * lastExported.ts: `subscribe` covers this tab (custom event) and other
 * tabs (the native "storage" event).
 */
export function readBacklogVisible(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeBacklogVisible(visible: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, visible ? "1" : "0");
  } catch {
    // Storage unavailable — the toggle still works until reload.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeBacklogVisible(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
