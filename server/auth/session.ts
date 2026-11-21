import "server-only";
import { getAuth } from "@/server/auth/neonAuth";
import { requireUserFrom, type AuthResult } from "@/server/auth/requireUser";

/**
 * The session check with Neon Auth wired in (#309). `/api/v1` routes don't call it
 * themselves: `handle()` in `server/api/handle.ts` does (#455); Server Actions do.
 */
export function requireUser(): Promise<AuthResult> {
  return requireUserFrom(() => getAuth().getSession());
}
