/**
 * One public address for the app (#396): requests that arrive on any other
 * host — the old Oregon service, the new service's own onrender.com address —
 * are sent to the canonical host with the same path and query.
 */

/** Hostname with an optional port: lowercase letters, digits, dots and hyphens. */
const HOST_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?::\d{1,5})?$/;

/**
 * Reads the `CANONICAL_HOST` value. An empty, missing or malformed value
 * returns null, so a typo means "no redirect" rather than a permanent
 * redirect to a wrong address that browsers remember.
 */
export function parseCanonicalHost(value: string | undefined): string | null {
  const host = value?.trim().toLowerCase();
  if (!host || !HOST_PATTERN.test(host)) return null;
  return host;
}

/**
 * Paths served on every host, never redirected: Render's health check (#305)
 * may arrive on the internal address and must reach the real route.
 */
export const CANONICAL_EXEMPT_PATHS = ["/api/health"] as const;

function isExemptPath(pathname: string): boolean {
  return CANONICAL_EXEMPT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export type RequestLocation = {
  /** Host the request was sent to (`x-forwarded-host`, else `host`). */
  host: string | null;
  pathname: string;
  /** Query string including the leading "?", or "". */
  search: string;
};

/**
 * Where to redirect a request, or null when it should be served as is:
 * no canonical host configured, an exempt path, no host on the request, or
 * already on the canonical host. Hosts compare case-insensitively; the target is always
 * https, because the canonical host is a public domain with TLS.
 */
export function canonicalRedirectUrl(
  request: RequestLocation,
  canonicalHost: string | null,
): string | null {
  if (!canonicalHost || isExemptPath(request.pathname)) return null;
  // A proxy may list several hosts ("a, b"); the first is the original one.
  const host = request.host?.split(",")[0]?.trim().toLowerCase();
  if (!host || host === canonicalHost) return null;
  return `https://${canonicalHost}${request.pathname}${request.search}`;
}
