import "server-only";
import { getAuth } from "@/server/auth/neonAuth";
import { requireUserFrom, type AuthResult } from "@/server/auth/requireUser";

/**
 * Every `/api/v1` Route Handler starts with this (#309, used from #310):
 *
 *   const auth = await requireUser();
 *   if (!auth.ok) return auth.response;
 *   const api = services({ db: getDb(), userId: auth.userId, source: "ui" });
 */
export function requireUser(): Promise<AuthResult> {
  return requireUserFrom(() => getAuth().getSession());
}
