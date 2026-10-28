import "server-only";

/**
 * In-memory sliding-window rate limiter (#309). One Render instance serves the
 * app, so memory is enough; the counts reset on a deploy, which is fine for
 * slowing down password guessing and email spam. Pure apart from the clock,
 * which is injected for tests.
 */
export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

export type RateLimiter = {
  /** Counts one attempt for `key` and says whether it is still allowed. */
  hit(key: string): RateLimitResult;
};

/** Above this many keys, expired ones are swept on the next hit. */
const SWEEP_THRESHOLD = 5_000;

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  function recent(key: string, time: number): number[] {
    const kept = (hits.get(key) ?? []).filter((at) => at > time - windowMs);
    if (kept.length === 0) hits.delete(key);
    else hits.set(key, kept);
    return kept;
  }

  return {
    hit(key) {
      const time = now();
      if (hits.size > SWEEP_THRESHOLD) {
        for (const stored of [...hits.keys()]) recent(stored, time);
      }
      const kept = recent(key, time);
      if (kept.length >= limit) {
        // The oldest hit in the window decides when the next one is allowed.
        const retryAfterMs = kept[0] + windowMs - time;
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      }
      hits.set(key, [...kept, time]);
      return { allowed: true };
    },
  };
}
