import { describe, expect, it } from "vitest";
import {
  cacheNames,
  pageKey,
  pagesToEvict,
  staleCacheNames,
  swStrategy,
  type SwRequest,
} from "./strategy";

const ORIGIN = "https://morgen.example";
const get = (path: string, overrides: Partial<SwRequest> = {}): SwRequest => ({
  url: path.startsWith("http") ? path : `${ORIGIN}${path}`,
  method: "GET",
  mode: "cors",
  rsc: false,
  ...overrides,
});

describe("swStrategy", () => {
  it("serves hashed build files and icons cache-first", () => {
    expect(swStrategy(get("/_next/static/chunks/app-1a2b.js"), ORIGIN)).toBe("static");
    expect(swStrategy(get("/_next/static/media/font.woff2"), ORIGIN)).toBe("static");
    expect(swStrategy(get("/icons/icon-192.png"), ORIGIN)).toBe("static");
  });

  it("treats page loads as network-first pages", () => {
    expect(swStrategy(get("/today", { mode: "navigate" }), ORIGIN)).toBe("page");
    expect(swStrategy(get("/today?new=1", { mode: "navigate" }), ORIGIN)).toBe("page");
  });

  it("revalidates other same-origin files in the background", () => {
    expect(swStrategy(get("/manifest.webmanifest"), ORIGIN)).toBe("swr");
    expect(swStrategy(get("/favicon.ico"), ORIGIN)).toBe("swr");
  });

  it("leaves API calls, the worker itself and RSC payloads to the network", () => {
    expect(swStrategy(get("/api/tasks"), ORIGIN)).toBe("network");
    expect(swStrategy(get("/api"), ORIGIN)).toBe("network");
    expect(swStrategy(get("/sw.js"), ORIGIN)).toBe("network");
    expect(swStrategy(get("/tasks", { rsc: true }), ORIGIN)).toBe("network");
    expect(swStrategy(get("/tasks?_rsc=abc12"), ORIGIN)).toBe("network");
  });

  it("never handles non-GET or cross-origin requests", () => {
    expect(swStrategy(get("/today", { method: "POST", mode: "navigate" }), ORIGIN)).toBe("network");
    expect(swStrategy(get("https://fonts.example/a.css"), ORIGIN)).toBe("network");
  });

  it("doesn't mistake look-alike paths for API or static routes", () => {
    expect(swStrategy(get("/apiary"), ORIGIN)).toBe("swr");
    expect(swStrategy(get("/iconsx.png"), ORIGIN)).toBe("swr");
  });
});

describe("pageKey", () => {
  it("drops the query and hash", () => {
    expect(pageKey(`${ORIGIN}/today?new=1#top`)).toBe(`${ORIGIN}/today`);
  });
});

describe("cache names", () => {
  it("are versioned", () => {
    expect(cacheNames("abc")).toEqual({
      static: "mm-static-abc",
      pages: "mm-pages-abc",
      assets: "mm-assets-abc",
    });
  });

  it("finds our caches from older versions only", () => {
    const names = ["mm-static-old", "mm-pages-old", "mm-static-new", "mm-pages-new", "other-cache"];
    expect(staleCacheNames(names, "new")).toEqual(["mm-static-old", "mm-pages-old"]);
  });
});

describe("pagesToEvict", () => {
  const url = (path: string) => `${ORIGIN}${path}`;

  it("drops the oldest pages above the limit and keeps /offline", () => {
    const urls = [url("/offline"), url("/a"), url("/b"), url("/c")];
    expect(pagesToEvict(urls, 2)).toEqual([url("/a")]);
  });

  it("drops nothing at or below the limit", () => {
    expect(pagesToEvict([url("/offline"), url("/a")], 1)).toEqual([]);
  });
});
