import { describe, expect, it } from "vitest";
import { AUTH_LIMITS, authActionFor, createAuthRateLimit } from "@/server/auth/authRateLimit";

describe("authActionFor (#309)", () => {
  it("sorts the Better Auth endpoints", () => {
    expect(authActionFor(["sign-in", "email"])).toBe("attempt");
    expect(authActionFor(["email-otp", "verify-email"])).toBe("attempt");
    expect(authActionFor(["reset-password"])).toBe("attempt");
    expect(authActionFor(["sign-up", "email"])).toBe("email");
    expect(authActionFor(["email-otp", "send-verification-otp"])).toBe("email");
    expect(authActionFor(["request-password-reset"])).toBe("email");
    expect(authActionFor(["get-session"])).toBeNull();
    expect(authActionFor(["sign-out"])).toBeNull();
  });
});

describe("createAuthRateLimit", () => {
  const signIn = (ip: string, email: string | null = "niko@example.com") => ({
    path: ["sign-in", "email"],
    ip,
    email,
  });

  it("blocks the 11th sign-in attempt from one IP within 15 minutes", () => {
    let time = 0;
    const limit = createAuthRateLimit(() => time);
    for (let i = 0; i < 10; i++) {
      expect(limit.check(signIn("1.2.3.4", `user${i}@example.com`)).allowed).toBe(true);
      time += 1_000;
    }
    const blocked = limit.check(signIn("1.2.3.4", "other@example.com"));
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSec).toBe(15 * 60 - 10);
  });

  it("also limits one email address across many IPs, case-insensitively", () => {
    const limit = createAuthRateLimit(() => 0);
    for (let i = 0; i < 10; i++) limit.check(signIn(`10.0.0.${i}`, "Niko@Example.com "));
    expect(limit.check(signIn("9.9.9.9", "niko@example.com")).allowed).toBe(false);
    expect(limit.check(signIn("9.9.9.9", "someone@example.com")).allowed).toBe(true);
  });

  it("allows 5 email-sending requests per hour", () => {
    const limit = createAuthRateLimit(() => 0);
    const signUp = (i: number) => ({
      path: ["sign-up", "email"],
      ip: "1.2.3.4",
      email: `u${i}@x.de`,
    });
    for (let i = 0; i < AUTH_LIMITS.email.limit; i++)
      expect(limit.check(signUp(i)).allowed).toBe(true);
    expect(limit.check(signUp(99)).allowed).toBe(false);
  });

  it("never limits session reads or sign-out", () => {
    const limit = createAuthRateLimit(() => 0);
    for (let i = 0; i < 50; i++) {
      expect(limit.check({ path: ["get-session"], ip: "1.2.3.4", email: null }).allowed).toBe(true);
    }
  });

  it("has a global ceiling over many IPs", () => {
    const limit = createAuthRateLimit(() => 0);
    for (let i = 0; i < AUTH_LIMITS.global.limit; i++) {
      limit.check(signIn(`ip-${i}`, null));
    }
    expect(limit.check(signIn("fresh-ip", null)).allowed).toBe(false);
  });
});
