import { describe, expect, it } from "vitest";
import { parseAuthEnv } from "@/server/env/parseAuthEnv";

const SECRET = "s".repeat(32);
const URL = "https://ep-x.neonauth.eu-central-1.aws.neon.tech/neondb/auth";

describe("parseAuthEnv (#309)", () => {
  it("accepts an https URL and a long enough secret", () => {
    expect(parseAuthEnv({ NEON_AUTH_BASE_URL: URL, NEON_AUTH_COOKIE_SECRET: SECRET })).toEqual({
      NEON_AUTH_BASE_URL: URL,
      NEON_AUTH_COOKIE_SECRET: SECRET,
    });
  });

  it("names missing variables", () => {
    expect(() => parseAuthEnv({})).toThrow(
      /NEON_AUTH_BASE_URL: missing.*NEON_AUTH_COOKIE_SECRET: missing/,
    );
  });

  it("rejects a short secret and a non-https URL without echoing them", () => {
    const run = () =>
      parseAuthEnv({
        NEON_AUTH_BASE_URL: "http://secret-host",
        NEON_AUTH_COOKIE_SECRET: "tiny-secret",
      });
    expect(run).toThrow(/must be an https:\/\/ URL/);
    expect(run).toThrow(/at least 32 characters/);
    expect(run).not.toThrow(/secret-host|tiny-secret/);
  });
});
