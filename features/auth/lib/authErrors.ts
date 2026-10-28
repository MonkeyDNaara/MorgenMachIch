/**
 * Turns an error from the auth client into one friendly sentence (#445).
 * The Neon Auth client throws `AuthApiError` / `AuthError` with a normalized
 * snake_case `code` and the HTTP `status`; OTP errors keep Better Auth's
 * message ("Invalid OTP"). Our own 429 from `/api/auth` (#309) already
 * carries a readable message with the wait time. Pure, so it's tested
 * without the client.
 */
export type AuthErrorLike = { code?: unknown; status?: unknown; message?: unknown };

const BY_CODE: Record<string, string> = {
  invalid_credentials: "Wrong email or password.",
  email_not_confirmed: "Your email isn't confirmed yet.",
  user_already_exists: "There's already an account for this email. Sign in instead.",
  weak_password: "Use at least 12 characters.",
  email_address_invalid: "That email address doesn't look right.",
};

const BY_MESSAGE: Record<string, string> = {
  "invalid otp": "That code isn't right.",
  "otp expired": "That code has expired. Send a new one.",
  "too many attempts": "Too many wrong codes. Send a new one.",
};

export function authErrorCode(error: unknown): string | null {
  const code = (error as AuthErrorLike | null)?.code;
  return typeof code === "string" ? code : null;
}

export function authErrorMessage(error: unknown): string {
  const { code, status, message } = (error ?? {}) as AuthErrorLike;
  const text = typeof message === "string" ? message : "";
  if (status === 429 || code === "over_request_rate_limit") {
    return text.startsWith("Too many attempts") ? text : "Too many attempts. Try again later.";
  }
  const byMessage = BY_MESSAGE[text.trim().toLowerCase()];
  if (byMessage) return byMessage;
  if (typeof code === "string" && BY_CODE[code]) return BY_CODE[code];
  if (error instanceof TypeError || /network|fetch/i.test(text)) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Try again.";
}
