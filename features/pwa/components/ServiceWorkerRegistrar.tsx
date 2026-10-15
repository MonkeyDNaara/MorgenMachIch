"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { WARM_MESSAGE } from "@/features/pwa/sw/strategy";
import { trackRegistration } from "@/features/pwa/lib/pwaStore";
import { shouldCheckForUpdate } from "@/features/pwa/lib/installState";

/** Production builds only, so `next dev` never serves stale files. */
function serviceWorkerEnabled(): boolean {
  return process.env.NODE_ENV === "production" && "serviceWorker" in navigator;
}

/** Asks the worker to cache a page (and files) it didn't fetch itself. */
function warm(worker: ServiceWorker | null | undefined, assets: string[] = []) {
  worker?.postMessage({ type: WARM_MESSAGE, page: window.location.href, assets });
}

/**
 * Registers the service worker (#81). On the very first visit the page
 * isn't controlled yet, so it tells the new worker which files it already
 * loaded; after that, every client-side navigation reports the new page,
 * because those only fetch RSC payloads and the page itself would never
 * reach the cache. With that, every page opened once works offline.
 * It also hands the registration to the PWA store, which notices a waiting
 * new version (#82). Renders nothing.
 */
export default function ServiceWorkerRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (!serviceWorkerEnabled()) return;
    let registration: ServiceWorkerRegistration | null = null;
    let lastCheck = Date.now();

    const register = async () => {
      try {
        const firstVisit = !navigator.serviceWorker.controller;
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        trackRegistration(registration);
        if (!firstVisit) return;
        const { active } = await navigator.serviceWorker.ready;
        warm(
          active,
          performance.getEntriesByType("resource").map((entry) => entry.name),
        );
      } catch (error) {
        console.warn("Service worker registration failed", error);
      }
    };

    // An installed app can stay open for days: look for a new deploy when
    // it comes back into view, at most every 30 minutes (#82).
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !registration) return;
      if (!shouldCheckForUpdate(lastCheck, Date.now())) return;
      lastCheck = Date.now();
      registration.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);

    // After load, so registering doesn't compete with the first render.
    const onLoad = () => void register();
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", onLoad, { once: true });
    return () => {
      window.removeEventListener("load", onLoad);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (serviceWorkerEnabled()) warm(navigator.serviceWorker.controller);
  }, [pathname]);

  return null;
}
