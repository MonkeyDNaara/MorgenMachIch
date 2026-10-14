import { SKIP_WAITING_MESSAGE } from "@/lib/sw/strategy";

/** Chromium's install prompt event (not in the DOM typings yet). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaSnapshot = {
  canPrompt: boolean;
  justInstalled: boolean;
  /** A new service worker is installed and waits for "Reload". */
  updateReady: boolean;
};

/**
 * App-wide PWA state (#82) as a small external store for
 * `useSyncExternalStore`: the saved install prompt, "installed just now",
 * and a waiting service worker. The install listeners are added when this
 * module is first evaluated (it's imported from the root layout), because
 * `beforeinstallprompt` can fire before any effect runs.
 */
let snapshot: PwaSnapshot = { canPrompt: false, justInstalled: false, updateReady: false };
let installPrompt: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
let reloadRequested = false;
const listeners = new Set<() => void>();

export const SERVER_SNAPSHOT: PwaSnapshot = snapshot;

function update(patch: Partial<PwaSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaSnapshot(): PwaSnapshot {
  return snapshot;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // No mini-infobar: installing is offered in Settings only (#82).
    event.preventDefault();
    installPrompt = event as BeforeInstallPromptEvent;
    update({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    update({ canPrompt: false, justInstalled: true });
  });
}

/** Shows the browser's install dialog; a prompt can only be used once. */
export async function promptInstall(): Promise<void> {
  const event = installPrompt;
  if (!event) return;
  installPrompt = null;
  update({ canPrompt: false });
  await event.prompt();
  // "accepted" also fires appinstalled; nothing else to do here.
  await event.userChoice;
}

function setWaiting(worker: ServiceWorker | null) {
  waitingWorker = worker;
  update({ updateReady: worker !== null });
}

/**
 * Watches a registration for a new version. Only an *update* counts: on
 * the very first install there is no controller yet and nothing to reload.
 */
export function trackRegistration(registration: ServiceWorkerRegistration) {
  const hasController = () => navigator.serviceWorker.controller !== null;
  if (registration.waiting && hasController()) setWaiting(registration.waiting);
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed" && hasController()) setWaiting(worker);
    });
  });
}

/** Activates the waiting worker and reloads once it has taken over. */
export function applyUpdate() {
  if (!waitingWorker) return;
  if (!reloadRequested) {
    reloadRequested = true;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
      once: true,
    });
  }
  waitingWorker.postMessage({ type: SKIP_WAITING_MESSAGE });
}
