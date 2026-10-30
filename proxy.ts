import { NextResponse, type NextRequest } from "next/server";
import { canonicalRedirectUrl, parseCanonicalHost } from "@/lib/utils/canonicalHost";
import { authRequired, isGatedPath, withNextParam } from "@/lib/utils/authGate";
import { getAuth } from "@/server/auth/neonAuth";

/**
 * 1. Canonical host (#396): with `CANONICAL_HOST` set (on Render, never
 *    locally), every request that arrives on another host gets a 308 to the
 *    same path on that host — the old Oregon service and the new service's
 *    own onrender.com address both point to https://morgenmachich.de. No
 *    matcher: static files and the service worker redirect too.
 * 2. Login gate (#446): only with `AUTH_REQUIRED=1`, and only for the app's
 *    pages (lib/utils/authGate). Neon's middleware checks the session cookie
 *    (and refreshes it); anonymous visitors go to /sign-in?next=<page>.
 *    API routes are not gated here — they answer 401 via requireUser().
 * Without both variables the proxy does nothing.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = canonicalRedirectUrl(
    {
      host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
      pathname,
      search,
    },
    parseCanonicalHost(process.env.CANONICAL_HOST),
  );
  if (target) return NextResponse.redirect(target, 308);

  if (!authRequired(process.env.AUTH_REQUIRED) || !isGatedPath(pathname)) {
    return NextResponse.next();
  }

  const response = await getAuth().middleware({ loginUrl: "/sign-in" })(request);
  const location = response.headers.get("location");
  if (!location || new URL(location, request.url).pathname !== "/sign-in") return response;

  // Keep any cookies Neon cleared or refreshed, and add where the visitor wanted to go.
  const redirect = NextResponse.redirect(
    new URL(withNextParam(location, `${pathname}${search}`), request.url),
    response.status,
  );
  for (const cookie of response.headers.getSetCookie())
    redirect.headers.append("Set-Cookie", cookie);
  return redirect;
}
