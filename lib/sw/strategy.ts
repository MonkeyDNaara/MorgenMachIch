/**
 * Routing rules of the hand-written service worker (#81). Pure functions,
 * so they are unit-tested here and then compiled into public/sw.js by
 * scripts/build-sw.mjs. Keep this file free of imports: it is copied into
 * the worker as plain code.
 */

/** How the worker answers a request:
 * - `static`: cache-first (hashed build files and icons never change)
 * - `page`: network-first with a timeout, then the cached page, then /offline
 * - `swr`: stale-while-revalidate (fonts, manifest, favicon, …)
 * - `network`: not handled, the browser fetches as usual */
export type SwStrategy = "static" | "page" | "swr" | "network";

export type SwRequest = {
  url: string;
  method: string;
  /** Request.mode: "navigate" for page loads. */
  mode: string;
  /** Next's RSC payload fetches (client-side navigation) send `RSC: 1`. */
  rsc: boolean;
};

/** After this, a cached page is shown while the network keeps loading in
 * the background (Render's free tier needs 30–50 s to wake up). */
export const PAGE_TIMEOUT_MS = 3000;
/** Pages kept per version; the oldest are dropped first. */
export const MAX_PAGES = 25;
export const OFFLINE_URL = "/offline";
/** Message the page sends with the URLs it loaded before the worker took
 * control, so even the first visit is available offline. */
export const WARM_MESSAGE = "CACHE_URLS";

const CACHE_PREFIX = "mm-";
const STATIC_PREFIXES = ["/_next/static/", "/icons/"];

export function swStrategy(request: SwRequest, origin: string): SwStrategy {
  if (request.method !== "GET") return "network";
  const url = new URL(request.url);
  if (url.origin !== origin) return "network";
  const path = url.pathname;
  if (path === "/api" || path.startsWith("/api/") || path === "/sw.js") return "network";
  // RSC payloads depend on router state headers; caching them is unreliable.
  // Offline, Next falls back to a full page load, which `page` covers.
  if (request.rsc || url.searchParams.has("_rsc")) return "network";
  if (request.mode === "navigate") return "page";
  if (STATIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return "static";
  return "swr";
}

/** Pages are cached without their query (/today?new=1 → /today). */
export function pageKey(url: string): string {
  const { origin, pathname } = new URL(url);
  return `${origin}${pathname}`;
}

/** One set of caches per deploy; `version` comes from the build. */
export function cacheNames(version: string) {
  return {
    static: `${CACHE_PREFIX}static-${version}`,
    pages: `${CACHE_PREFIX}pages-${version}`,
    assets: `${CACHE_PREFIX}assets-${version}`,
  };
}

/** Our caches from older versions (deleted on activate). Caches that
 * don't start with the prefix belong to someone else and are kept. */
export function staleCacheNames(names: readonly string[], version: string): string[] {
  const current = Object.values(cacheNames(version));
  return names.filter((name) => name.startsWith(CACHE_PREFIX) && !current.includes(name));
}

/** Oldest page URLs to drop so at most `max` pages remain (the offline
 * page doesn't count and is never dropped). `urls` is in insertion order. */
export function pagesToEvict(urls: readonly string[], max: number): string[] {
  const pages = urls.filter((url) => new URL(url).pathname !== OFFLINE_URL);
  return pages.slice(0, Math.max(0, pages.length - max));
}
