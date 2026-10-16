import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/server/env/parseServerEnv";

const POOLED = "postgresql://user:secret-value@ep-x-pooler.eu-central-1.aws.neon.tech/neondb";

describe("parseServerEnv", () => {
  it("accepts a postgres connection string", () => {
    expect(parseServerEnv({ DATABASE_URL: POOLED }).DATABASE_URL).toBe(POOLED);
  });

  it("accepts the postgres:// scheme and an optional direct URL", () => {
    const env = parseServerEnv({
      DATABASE_URL: "postgres://a@b/c",
      DATABASE_URL_UNPOOLED: "postgres://a@d/c",
    });
    expect(env.DATABASE_URL_UNPOOLED).toBe("postgres://a@d/c");
  });

  it("names a missing variable", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL: missing/);
  });

  it("rejects a value that is not a postgres URL without echoing it", () => {
    const run = () => parseServerEnv({ DATABASE_URL: "https://secret-value.example.com" });
    expect(run).toThrow(/DATABASE_URL: must be a postgres:\/\/ connection string/);
    expect(run).not.toThrow(/secret-value/);
  });

  it("ignores unrelated variables", () => {
    expect(parseServerEnv({ DATABASE_URL: POOLED, PATH: "/usr/bin" })).toEqual({
      DATABASE_URL: POOLED,
    });
  });
});
