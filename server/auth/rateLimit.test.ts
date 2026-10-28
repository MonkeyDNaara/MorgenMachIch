import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/server/auth/rateLimit";

function clock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe("createRateLimiter (#309)", () => {
  it("allows up to the limit within the window, then blocks with Retry-After", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: c.now });
    expect(limiter.hit("a")).toEqual({ allowed: true });
    c.advance(10_000);
    expect(limiter.hit("a")).toEqual({ allowed: true });
    expect(limiter.hit("a")).toEqual({ allowed: true });
    // The first attempt (t = 0) leaves the window at 60 s; it is now 10 s.
    expect(limiter.hit("a")).toEqual({ allowed: false, retryAfterSec: 50 });
  });

  it("slides: an attempt is allowed again once the oldest one leaves the window", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: c.now });
    limiter.hit("a");
    c.advance(500);
    limiter.hit("a");
    expect(limiter.hit("a").allowed).toBe(false);
    c.advance(501);
    expect(limiter.hit("a").allowed).toBe(true);
    expect(limiter.hit("a").allowed).toBe(false);
  });

  it("does not count blocked attempts", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: c.now });
    limiter.hit("a");
    for (let i = 0; i < 5; i++) limiter.hit("a");
    c.advance(1_001);
    expect(limiter.hit("a").allowed).toBe(true);
  });

  it("keeps keys apart", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => 0 });
    expect(limiter.hit("a").allowed).toBe(true);
    expect(limiter.hit("b").allowed).toBe(true);
    expect(limiter.hit("a").allowed).toBe(false);
  });

  it("never asks to wait less than a second", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: c.now });
    limiter.hit("a");
    c.advance(999);
    expect(limiter.hit("a")).toEqual({ allowed: false, retryAfterSec: 1 });
  });
});
