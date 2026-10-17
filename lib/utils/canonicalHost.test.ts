import { describe, expect, it } from "vitest";
import { canonicalRedirectUrl, parseCanonicalHost } from "./canonicalHost";

const CANONICAL = "morgenmachich.de";

function at(host: string | null, pathname = "/", search = "") {
  return { host, pathname, search };
}

describe("parseCanonicalHost", () => {
  it("accepts a hostname, trimmed and lowercased", () => {
    expect(parseCanonicalHost("morgenmachich.de")).toBe("morgenmachich.de");
    expect(parseCanonicalHost("  MorgenMachIch.de ")).toBe("morgenmachich.de");
    expect(parseCanonicalHost("localhost:3000")).toBe("localhost:3000");
  });

  it("returns null for a missing, empty or malformed value", () => {
    expect(parseCanonicalHost(undefined)).toBeNull();
    expect(parseCanonicalHost("")).toBeNull();
    expect(parseCanonicalHost("   ")).toBeNull();
    expect(parseCanonicalHost("https://morgenmachich.de")).toBeNull();
    expect(parseCanonicalHost("morgenmachich.de/today")).toBeNull();
    expect(parseCanonicalHost("morgen machich.de")).toBeNull();
    expect(parseCanonicalHost("-morgenmachich.de")).toBeNull();
    expect(parseCanonicalHost("morgenmachich..de")).toBeNull();
  });
});

describe("canonicalRedirectUrl", () => {
  it("does nothing without a canonical host", () => {
    expect(canonicalRedirectUrl(at("morgen-mach-ich.onrender.com"), null)).toBeNull();
  });

  it("serves requests that already use the canonical host", () => {
    expect(canonicalRedirectUrl(at("morgenmachich.de", "/today"), CANONICAL)).toBeNull();
    expect(canonicalRedirectUrl(at("MorgenMachIch.DE"), CANONICAL)).toBeNull();
  });

  it("does nothing when the request has no host", () => {
    expect(canonicalRedirectUrl(at(null), CANONICAL)).toBeNull();
    expect(canonicalRedirectUrl(at(""), CANONICAL)).toBeNull();
  });

  it("redirects other hosts to https on the canonical host, keeping path and query", () => {
    expect(canonicalRedirectUrl(at("morgen-mach-ich.onrender.com"), CANONICAL)).toBe(
      "https://morgenmachich.de/",
    );
    expect(
      canonicalRedirectUrl(at("morgenmachich.onrender.com", "/today", "?new=1&x=2"), CANONICAL),
    ).toBe("https://morgenmachich.de/today?new=1&x=2");
    expect(canonicalRedirectUrl(at("www.morgenmachich.de", "/stats"), CANONICAL)).toBe(
      "https://morgenmachich.de/stats",
    );
  });

  it("treats a port as part of the host", () => {
    expect(canonicalRedirectUrl(at("morgenmachich.de:8080"), CANONICAL)).toBe(
      "https://morgenmachich.de/",
    );
    expect(canonicalRedirectUrl(at("localhost:3000"), "localhost:3000")).toBeNull();
  });

  it("never redirects the health check (#305)", () => {
    expect(canonicalRedirectUrl(at("srv-internal:10000", "/api/health"), CANONICAL)).toBeNull();
    expect(
      canonicalRedirectUrl(at("morgenmachich.onrender.com", "/api/health", "?db=1"), CANONICAL),
    ).toBeNull();
    expect(canonicalRedirectUrl(at("old.onrender.com", "/api/health/x"), CANONICAL)).toBeNull();
    expect(canonicalRedirectUrl(at("old.onrender.com", "/api/healthcheck"), CANONICAL)).toBe(
      "https://morgenmachich.de/api/healthcheck",
    );
    expect(canonicalRedirectUrl(at("old.onrender.com", "/api/v1/tasks"), CANONICAL)).toBe(
      "https://morgenmachich.de/api/v1/tasks",
    );
  });

  it("uses the first host when a proxy lists several", () => {
    expect(canonicalRedirectUrl(at("morgenmachich.de, internal:10000"), CANONICAL)).toBeNull();
    expect(canonicalRedirectUrl(at("old.onrender.com, morgenmachich.de"), CANONICAL)).toBe(
      "https://morgenmachich.de/",
    );
  });
});
