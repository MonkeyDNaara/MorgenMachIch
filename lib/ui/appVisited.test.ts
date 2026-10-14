import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { APP_VISITED_KEY, SKIP_LANDING_SCRIPT, shouldSkipLanding } from "./appVisited";

/** Runs the inline script with a fake localStorage and location. */
function runScript(pathname: string, search: string, stored: string | null): string | null {
  let target: string | null = null;
  runInNewContext(SKIP_LANDING_SCRIPT, {
    URLSearchParams,
    localStorage: { getItem: (key: string) => (key === APP_VISITED_KEY ? stored : null) },
    location: { pathname, search, replace: (url: string) => (target = url) },
  });
  return target;
}

describe("shouldSkipLanding", () => {
  it("skips the landing page for returning users", () => {
    expect(shouldSkipLanding("/", "", true)).toBe(true);
    expect(shouldSkipLanding("/", "?utm_source=cv", true)).toBe(true);
  });

  it("shows it to first-time visitors and with ?landing", () => {
    expect(shouldSkipLanding("/", "", false)).toBe(false);
    expect(shouldSkipLanding("/", "?landing", true)).toBe(false);
    expect(shouldSkipLanding("/", "?a=1&landing=1", true)).toBe(false);
  });

  it("only applies to the landing page itself", () => {
    expect(shouldSkipLanding("/today", "", true)).toBe(false);
    expect(shouldSkipLanding("/impressum", "", true)).toBe(false);
  });
});

describe("SKIP_LANDING_SCRIPT", () => {
  const cases: [string, string, string | null][] = [
    ["/", "", "1"],
    ["/", "", null],
    ["/", "", "0"],
    ["/", "?landing", "1"],
    ["/today", "", "1"],
    ["/impressum", "", "1"],
  ];

  it.each(cases)("matches shouldSkipLanding for %s%s (flag %s)", (pathname, search, stored) => {
    const expected = shouldSkipLanding(pathname, search, stored === "1") ? "/today" : null;
    expect(runScript(pathname, search, stored)).toBe(expected);
  });

  it("does nothing when storage throws", () => {
    let target: string | null = null;
    runInNewContext(SKIP_LANDING_SCRIPT, {
      URLSearchParams,
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
      location: { pathname: "/", search: "", replace: (url: string) => (target = url) },
    });
    expect(target).toBeNull();
  });
});
