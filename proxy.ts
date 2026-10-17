import { NextResponse, type NextRequest } from "next/server";
import { canonicalRedirectUrl, parseCanonicalHost } from "@/lib/utils/canonicalHost";

/**
 * Canonical host (#396): with `CANONICAL_HOST` set (on Render, never
 * locally), every request that arrives on another host gets a 308 to the
 * same path on that host — the old Oregon service and the new service's own
 * onrender.com address both point to https://morgenmachich.de. No matcher:
 * static files and the service worker redirect too. Without the variable
 * the proxy does nothing.
 */
export function proxy(request: NextRequest) {
  const target = canonicalRedirectUrl(
    {
      host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
    },
    parseCanonicalHost(process.env.CANONICAL_HOST),
  );
  return target ? NextResponse.redirect(target, 308) : NextResponse.next();
}
