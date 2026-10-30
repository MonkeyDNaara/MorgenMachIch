import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GATED_PATHS, authRequired, isGatedPath, withNextParam } from "./authGate";

describe("authRequired (#446)", () => {
  it("is on only for 1 / true", () => {
    expect(authRequired("1")).toBe(true);
    expect(authRequired(" TRUE ")).toBe(true);
    for (const off of [undefined, "", "0", "false", "yes"]) expect(authRequired(off)).toBe(false);
  });
});

describe("isGatedPath", () => {
  it("gates the app pages and their subpaths", () => {
    expect(isGatedPath("/today")).toBe(true);
    expect(isGatedPath("/settings")).toBe(true);
    expect(isGatedPath("/tasks/abc")).toBe(true);
  });

  it("keeps public pages, auth, API, offline and static files open", () => {
    for (const path of [
      "/",
      "/impressum",
      "/datenschutz",
      "/sign-in",
      "/sign-up",
      "/api/health",
      "/api/auth/get-session",
      "/offline",
      "/sw.js",
      "/manifest.webmanifest",
      "/_next/static/chunk.js",
      "/todayish",
    ]) {
      expect(isGatedPath(path), path).toBe(false);
    }
  });

  it("covers every page of the app shell except the offline page", () => {
    const appDir = join(process.cwd(), "app", "(app)");
    const routes = readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
      .map((entry) => `/${entry.name}`)
      .filter((route) => route !== "/offline");
    expect([...routes].sort()).toEqual([...GATED_PATHS].sort());
  });
});

describe("withNextParam", () => {
  it("adds the requested page to a relative or absolute sign-in URL", () => {
    expect(withNextParam("/sign-in", "/tasks?filter=open")).toBe(
      "/sign-in?next=%2Ftasks%3Ffilter%3Dopen",
    );
    expect(withNextParam("/sign-in?filter=open", "/tasks?filter=open")).toBe(
      "/sign-in?next=%2Ftasks%3Ffilter%3Dopen",
    );
    expect(withNextParam("https://morgenmachich.de/sign-in", "/today")).toBe(
      "https://morgenmachich.de/sign-in?next=%2Ftoday",
    );
  });
});
