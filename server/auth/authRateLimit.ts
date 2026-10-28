import "server-only";

import { createRateLimiter, type RateLimitResult } from "@/server/auth/rateLimit";

/**
 * Which Better Auth endpoints are rate-limited (#309), by the kind of abuse:
 * - "attempt": guessing a password or a 6-digit code
 * - "email": anything that sends an email (sign-up, codes, password reset)
 * Everything else (session reads, sign-out) is not limited.
 */
export type AuthAction = "attempt" | "email";

const ATTEMPT_PATHS = new Set([
  "email-otp/verify-email",
  "email-otp/check-verification-otp",
  "email-otp/reset-password",
  "reset-password",
  "verify-email",
]);

const EMAIL_PATHS = new Set([
  "email-otp/send-verification-otp",
  "email-otp/request-password-reset",
  "email-otp/request-email-change",
  "request-password-reset",
  "forget-password",
  "forget-password/email-otp",
  "send-verification-email",
]);

export function authActionFor(path: readonly string[]): AuthAction | null {
  const joined = path.join("/");
  if (path[0] === "sign-in" || ATTEMPT_PATHS.has(joined)) return "attempt";
  if (path[0] === "sign-up" || EMAIL_PATHS.has(joined)) return "email";
  return null;
}

const MINUTE = 60_000;

/** Limits per window (decided in #309). */
export const AUTH_LIMITS = {
  attempt: { limit: 10, windowMs: 15 * MINUTE },
  email: { limit: 5, windowMs: 60 * MINUTE },
  /** Ceiling over all limited requests together, against a spread-out flood. */
  global: { limit: 300, windowMs: 15 * MINUTE },
} as const;

export type AuthRateLimit = {
  check(request: { path: readonly string[]; ip: string; email: string | null }): RateLimitResult;
};

/**
 * One limiter set per server process. A limited request is counted per IP
 * and — when the body names one — per email address (so one account can't be
 * attacked from many IPs, nor one inbox be flooded), plus the global ceiling.
 */
export function createAuthRateLimit(now: () => number = Date.now): AuthRateLimit {
  const limiters = {
    attempt: createRateLimiter({ ...AUTH_LIMITS.attempt, now }),
    email: createRateLimiter({ ...AUTH_LIMITS.email, now }),
    global: createRateLimiter({ ...AUTH_LIMITS.global, now }),
  };

  return {
    check({ path, ip, email }) {
      const action = authActionFor(path);
      if (!action) return { allowed: true };
      const keys = [`ip:${ip}`];
      const normalized = email?.trim().toLowerCase();
      if (normalized) keys.push(`email:${normalized}`);
      const results = [limiters.global.hit("all"), ...keys.map((key) => limiters[action].hit(key))];
      const blocked = results.filter((result) => !result.allowed);
      if (blocked.length === 0) return { allowed: true };
      return {
        allowed: false,
        retryAfterSec: Math.max(
          ...blocked.map((result) => (result.allowed ? 0 : result.retryAfterSec)),
        ),
      };
    },
  };
}
