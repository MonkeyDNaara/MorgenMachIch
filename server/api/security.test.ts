import { describe, expect, it } from "vitest";
import { checkRequest } from "@/server/api/security";

const URL = "http://localhost/api/v1/settings";
const JSON_TYPE = { "Content-Type": "application/json" };
const HOST = { host: "morgenmachich.de" };

function request(method: string, headers: Record<string, string> = {}) {
  return new Request(URL, { method, headers });
}

function result(method: string, headers: Record<string, string> = {}) {
  const error = checkRequest(request(method, headers));
  return error && { status: error.status, code: error.code };
}

describe("checkRequest (#455)", () => {
  it("lets reads through untouched", () => {
    expect(result("GET", { cookie: "s=1", origin: "https://evil.example" })).toBeNull();
    expect(result("HEAD")).toBeNull();
  });

  it("needs application/json on writes with a body", () => {
    for (const method of ["POST", "PUT", "PATCH"]) {
      expect(result(method, { "Content-Type": "text/plain" }), method).toEqual({
        status: 415,
        code: "unsupported_media_type",
      });
      expect(result(method, JSON_TYPE), method).toBeNull();
    }
    expect(result("DELETE")).toBeNull();
  });

  it("allows cookie writes from the same origin", () => {
    const cookie = { ...JSON_TYPE, ...HOST, cookie: "s=1" };
    expect(result("PATCH", { ...cookie, "sec-fetch-site": "same-origin" })).toBeNull();
    expect(result("PATCH", { ...cookie, origin: "https://morgenmachich.de" })).toBeNull();
    // Behind Render the original host comes in X-Forwarded-Host.
    expect(
      result("DELETE", {
        cookie: "s=1",
        host: "internal:10000",
        "x-forwarded-host": "morgenmachich.de",
        origin: "https://morgenmachich.de",
      }),
    ).toBeNull();
  });

  it("refuses cookie writes from another site or without any origin", () => {
    const cookie = { ...JSON_TYPE, ...HOST, cookie: "s=1" };
    const cases: Record<string, string>[] = [
      { origin: "https://evil.example" },
      { origin: "https://app.morgenmachich.de" },
      { origin: "null" },
      { origin: "not a url" },
      { "sec-fetch-site": "cross-site", origin: "https://morgenmachich.de" },
      { "sec-fetch-site": "same-site" },
      {},
    ];
    for (const headers of cases) {
      expect(result("POST", { ...cookie, ...headers }), JSON.stringify(headers)).toEqual({
        status: 403,
        code: "forbidden_origin",
      });
    }
  });

  it("doesn't check the origin of callers without cookies", () => {
    expect(result("POST", { ...JSON_TYPE, origin: "https://n8n.example" })).toBeNull();
  });
});
