/**
 * The Neon Auth client throws `AuthApiError` for failed requests, but the
 * underlying Better Auth client is configured with `throw: false`, so some
 * failures can still come back as `{ data: null, error }`. `authCall` turns
 * both into a thrown error, so every form handles errors in one `catch` (#445).
 */
export async function authCall<T>(request: Promise<T>): Promise<T> {
  const result = await request;
  const error = (result as { error?: unknown } | null)?.error;
  if (error) throw error;
  return result;
}

/** The browser's IANA time zone, e.g. "Europe/Berlin" (saved after sign-in). */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** True when a Better Auth `getSession()` result holds a signed-in user. */
export function hasSession(result: unknown): boolean {
  const data = (result as { data?: { user?: unknown } | null } | null)?.data;
  return Boolean(data?.user);
}
