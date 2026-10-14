"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { WARM_MESSAGE } from "@/lib/sw/strategy";

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
 * Renders nothing.
 */
export default function ServiceWorkerRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (!serviceWorkerEnabled()) return;

    const register = async () => {
      try {
        const firstVisit = !navigator.serviceWorker.controller;
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
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

    // After load, so registering doesn't compete with the first render.
    if (document.readyState === "complete") {
      void register();
      return;
    }
    const onLoad = () => void register();
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (serviceWorkerEnabled()) warm(navigator.serviceWorker.controller);
  }, [pathname]);

  return null;
}
