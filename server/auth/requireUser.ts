import "server-only";

/**
 * Session check for `/api/v1` Route Handlers (#309), pure so it is tested
 * without Next or Neon: the caller passes how to read the session
 * (`requireUser()` in `server/auth/session.ts` wires in Neon Auth).
 */
export type AuthResult = { ok: true; userId: string } | { ok: false; response: Response };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The user id from a Better Auth `getSession()` result; null without a valid session. */
export function userIdFromSession(result: unknown): string | null {
  const id = (result as { data?: { user?: { id?: unknown } } | null } | null)?.data?.user?.id;
  return typeof id === "string" && UUID.test(id) ? id : null;
}

/** The API's error contract (#310): `{ error: { code, message } }`, never cached. */
export function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function requireUserFrom(readSession: () => Promise<unknown>): Promise<AuthResult> {
  let result: unknown;
  try {
    result = await readSession();
  } catch (error) {
    // Neon Auth unreachable: not the client's fault, and no details leak out.
    console.error("Session check failed", error);
    return {
      ok: false,
      response: errorResponse(
        503,
        "auth_unavailable",
        "Sign-in is unavailable. Try again shortly.",
      ),
    };
  }
  const userId = userIdFromSession(result);
  if (!userId) {
    return { ok: false, response: errorResponse(401, "unauthorized", "Sign in to continue.") };
  }
  return { ok: true, userId };
}
