/**
 * Small pure helpers for the auth forms (#445).
 */

/** Better Auth needs a name; the app asks for none, so the part before the @ is sent. */
export function nameFromEmail(email: string): string {
  const local = email.trim().split("@")[0]?.trim() ?? "";
  return local.slice(0, 50) || "User";
}

/** The code field keeps digits only, at most six. */
export function cleanCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}

const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

/**
 * Where to go after signing in: a `?next=` path inside the app, otherwise
 * /today. Only plain same-origin paths pass — no scheme, no `//host`, no
 * backslashes, no API or auth pages — so the parameter can't send anyone to
 * another site (open redirect).
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/today";
  }
  if (/[\u0000-\u001f]/.test(raw)) return "/today";
  const path = raw.split(/[?#]/)[0];
  if (path === "/api" || path.startsWith("/api/")) return "/today";
  if (AUTH_PAGES.some((page) => path === page || path.startsWith(`${page}/`))) return "/today";
  return raw;
}

/** "1:00", "0:42" — the countdown next to "Resend code". */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** "N" for niko@…, the letter in the account circle (#445). */
export function initialOf(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "?";
}
