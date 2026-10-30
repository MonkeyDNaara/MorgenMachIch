/**
 * The login gate in `proxy.ts` (#446), pure so it is tested without Next.
 *
 * - Off unless `AUTH_REQUIRED` is "1" or "true": until the app reads its data
 *   from the server (#314) a gate would protect nothing and block the
 *   landing-page demo. API routes check the session themselves (requireUser).
 * - Only the app's pages are gated; the landing and legal pages, the auth
 *   pages, `/api/*`, the offline page and static files stay public.
 */
export const GATED_PATHS = ["/today", "/tasks", "/calendar", "/labels", "/stats", "/settings"];

export function authRequired(value: string | undefined): boolean {
  const flag = value?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

export function isGatedPath(pathname: string): boolean {
  return GATED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Neon's middleware sends anonymous visitors to the bare sign-in page; this
 * adds where they wanted to go as `?next=`, so sign-in (and Back) return
 * there. `location` may be relative or absolute; the result keeps its form.
 */
export function withNextParam(location: string, requested: string): string {
  const url = new URL(location, "http://placeholder.invalid");
  // Neon copies the page's own query onto the sign-in URL; it belongs in `next`.
  url.search = "";
  url.searchParams.set("next", requested);
  return location.startsWith("/") ? `${url.pathname}${url.search}` : url.toString();
}
