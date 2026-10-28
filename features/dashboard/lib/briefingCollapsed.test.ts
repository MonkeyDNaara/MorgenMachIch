// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BRIEFING_ATTRIBUTE,
  BRIEFING_COLLAPSED_KEY,
  BRIEFING_INIT_SCRIPT,
  applyBriefingCollapsed,
  briefingCollapsed,
  setBriefingCollapsed,
} from "./briefingCollapsed";

function runInitScript() {
  new Function(BRIEFING_INIT_SCRIPT)();
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute(BRIEFING_ATTRIBUTE);
  vi.restoreAllMocks();
});

describe("briefing collapse (#421)", () => {
  it("is expanded by default", () => {
    expect(briefingCollapsed.read()).toBe(false);
    runInitScript();
    expect(document.documentElement.hasAttribute(BRIEFING_ATTRIBUTE)).toBe(false);
  });

  it("init script sets the attribute only for a stored collapse", () => {
    window.localStorage.setItem(BRIEFING_COLLAPSED_KEY, "0");
    runInitScript();
    expect(document.documentElement.hasAttribute(BRIEFING_ATTRIBUTE)).toBe(false);

    window.localStorage.setItem(BRIEFING_COLLAPSED_KEY, "1");
    runInitScript();
    expect(document.documentElement.getAttribute(BRIEFING_ATTRIBUTE)).toBe("collapsed");
  });

  it("init script survives blocked storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(runInitScript).not.toThrow();
    expect(document.documentElement.hasAttribute(BRIEFING_ATTRIBUTE)).toBe(false);
  });

  it("setBriefingCollapsed updates the attribute and storage together", () => {
    setBriefingCollapsed(true);
    expect(document.documentElement.getAttribute(BRIEFING_ATTRIBUTE)).toBe("collapsed");
    expect(window.localStorage.getItem(BRIEFING_COLLAPSED_KEY)).toBe("1");

    setBriefingCollapsed(false);
    expect(document.documentElement.hasAttribute(BRIEFING_ATTRIBUTE)).toBe(false);
    expect(window.localStorage.getItem(BRIEFING_COLLAPSED_KEY)).toBe("0");
  });

  it("the stored value and the init script agree after a round trip", () => {
    setBriefingCollapsed(true);
    applyBriefingCollapsed(false); // like a fresh page load
    runInitScript();
    expect(document.documentElement.getAttribute(BRIEFING_ATTRIBUTE)).toBe("collapsed");
  });

  it("still applies the attribute when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => setBriefingCollapsed(true)).not.toThrow();
    expect(document.documentElement.getAttribute(BRIEFING_ATTRIBUTE)).toBe("collapsed");
  });
});
