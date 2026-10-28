import "server-only";
import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";
import { getAuthEnv } from "@/server/env";

let cached: NeonAuth | undefined;

/**
 * The Neon Auth server instance (#309, spike #306): session checks in Route
 * Handlers (`getSession()`), the `/api/auth/*` handler and, later, the proxy
 * gate (#446). Created lazily, so `next build` and CI never need the variables.
 */
export function getAuth(): NeonAuth {
  cached ??= (() => {
    const env = getAuthEnv();
    return createNeonAuth({
      baseUrl: env.NEON_AUTH_BASE_URL,
      cookies: { secret: env.NEON_AUTH_COOKIE_SECRET },
    });
  })();
  return cached;
}

let cachedHandler: ReturnType<NeonAuth["handler"]> | undefined;

/** The `/api/auth/*` route handlers, created once. */
export function getAuthHandler(): ReturnType<NeonAuth["handler"]> {
  cachedHandler ??= getAuth().handler();
  return cachedHandler;
}
