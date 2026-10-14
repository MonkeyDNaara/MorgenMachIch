/**
 * A per-browser on/off preference in localStorage, shaped for React's
 * useSyncExternalStore (#357; extracted from backlogVisible.ts, #182).
 * Never data the app depends on: every access is wrapped in try/catch
 * because storage can be blocked or throw (private windows, cleared site
 * data), and `subscribe` covers this tab (custom event) and other tabs
 * (the native "storage" event).
 */
export function createStoredFlag(key: string, fallback: boolean) {
  const changeEvent = `${key}-changed`;
  return {
    read(): boolean {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value === "1";
      } catch {
        return fallback;
      }
    },
    write(on: boolean): void {
      try {
        window.localStorage.setItem(key, on ? "1" : "0");
      } catch {
        // Storage unavailable — the toggle still works until reload.
      }
      window.dispatchEvent(new Event(changeEvent));
    },
    subscribe(onChange: () => void): () => void {
      window.addEventListener("storage", onChange);
      window.addEventListener(changeEvent, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(changeEvent, onChange);
      };
    },
  };
}
