/**
 * Password rules for sign-up and reset (#445). Neon Auth accepts 8 characters;
 * the app asks for 12, because sign-up is open to anyone. Checked in the form
 * only — the server stays the authority for what it accepts.
 */
export const MIN_PASSWORD_LENGTH = 12;

/** A short problem message, or null when the password is long enough. */
export function passwordProblem(password: string): string | null {
  return password.length < MIN_PASSWORD_LENGTH
    ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    : null;
}

/**
 * 0–4 for the small strength bar: length first, then variety. Below the
 * minimum it never shows more than one segment, so a short password with
 * symbols doesn't look "strong".
 */
export function passwordStrength(password: string): number {
  if (password.length === 0) return 0;
  if (password.length < MIN_PASSWORD_LENGTH) return 1;
  let score = 2;
  if (password.length >= 16) score += 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) =>
    kind.test(password),
  ).length;
  if (kinds >= 3) score += 1;
  return Math.min(score, 4);
}
