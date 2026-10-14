// Service worker body (#81). Not served as is: scripts/build-sw.mjs puts the
// routing rules from lib/sw/strategy.ts in front of it (swStrategy, pageKey,
// cacheNames, … are defined there), fills in the version and writes
// public/sw.js. Plain JS because it runs in the worker, outside of Next.

const VERSION = "__SW_VERSION__";
const CACHES = cacheNames(VERSION);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isCacheable = (response) => response.ok && response.type === "basic" && !response.redirected;

self.addEventListener("install", (event) => {
  // Only the offline fallback is precached; pages are cached as they're opened.
  event.waitUntil(caches.open(CACHES.pages).then((cache) => cache.add(OFFLINE_URL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(staleCacheNames(names, VERSION).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === WARM_MESSAGE) event.waitUntil(warm(event.data));
  // A new version waits (no automatic skipWaiting) until the user picks Reload (#82).
  if (event.data?.type === SKIP_WAITING_MESSAGE) self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const strategy = swStrategy(
    {
      url: request.url,
      method: request.method,
      mode: request.mode,
      rsc: request.headers.get("RSC") === "1",
    },
    self.location.origin,
  );
  if (strategy === "static") event.respondWith(cacheFirst(request));
  else if (strategy === "page") event.respondWith(networkFirst(event));
  else if (strategy === "swr") event.respondWith(staleWhileRevalidate(event));
  // "network": no respondWith, the browser handles it.
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHES.static);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(event) {
  const { request } = event;
  const cache = await caches.open(CACHES.pages);
  const key = pageKey(request.url);
  const network = fetch(request).then((response) => {
    if (isCacheable(response)) event.waitUntil(storePage(cache, key, response.clone()));
    return response;
  });
  // Keeps the worker alive until a slow network answer has been cached.
  event.waitUntil(network.catch(() => undefined));

  const cached = await cache.match(key);
  try {
    if (!cached) return await network;
    return await Promise.race([network, wait(PAGE_TIMEOUT_MS).then(() => cached)]);
  } catch {
    return cached ?? (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(CACHES.assets);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (isCacheable(response)) event.waitUntil(cache.put(request, response.clone()));
    return response;
  });
  if (!cached) return network;
  event.waitUntil(network.catch(() => undefined));
  return cached;
}

async function storePage(cache, key, response) {
  await cache.put(key, response);
  const keys = await cache.keys();
  const evict = pagesToEvict(
    keys.map((entry) => entry.url),
    MAX_PAGES,
  );
  await Promise.all(evict.map((url) => cache.delete(url)));
}

/**
 * Caches pages and files the browser loaded without going through this
 * worker: everything from the very first visit (before the worker took
 * control) and pages reached by client-side navigation, which only fetch
 * RSC payloads. Pages are static per deploy, so one copy per version is
 * enough; a later full page load refreshes it anyway.
 */
async function warm({ page, assets }) {
  const origin = self.location.origin;
  const jobs = [];
  const isPage =
    typeof page === "string" &&
    swStrategy({ url: page, method: "GET", mode: "navigate", rsc: false }, origin) === "page";
  if (isPage) {
    jobs.push(
      caches.open(CACHES.pages).then(async (cache) => {
        const key = pageKey(page);
        if (await cache.match(key)) return;
        const response = await fetch(key);
        if (isCacheable(response)) await storePage(cache, key, response);
      }),
    );
  }
  for (const url of Array.isArray(assets) ? assets : []) {
    const strategy = swStrategy({ url, method: "GET", mode: "no-cors", rsc: false }, origin);
    if (strategy !== "static" && strategy !== "swr") continue;
    const name = strategy === "static" ? CACHES.static : CACHES.assets;
    jobs.push(
      caches.open(name).then(async (cache) => {
        if (await cache.match(url)) return;
        const response = await fetch(url);
        if (isCacheable(response)) await cache.put(url, response);
      }),
    );
  }
  // One failed URL must not stop the others.
  await Promise.allSettled(jobs);
}
