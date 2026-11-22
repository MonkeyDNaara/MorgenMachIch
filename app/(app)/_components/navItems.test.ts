import { describe, expect, it } from "vitest";
import { MAIN_NAV, NAV_ITEMS, isActive, mainNav } from "@/app/(app)/_components/navItems";

describe("navigation (#465)", () => {
  it("puts Dashboard first and Today second", () => {
    expect(MAIN_NAV.slice(0, 2).map((item) => item.href)).toEqual(["/dashboard", "/today"]);
    expect(MAIN_NAV[0]).toBe(NAV_ITEMS.dashboard);
  });

  it("lists every main entry once", () => {
    const hrefs = MAIN_NAV.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual(["/dashboard", "/today", "/tasks", "/calendar", "/labels", "/stats"]);
  });

  it("marks /dashboard active only on its own path", () => {
    expect(isActive("/dashboard", "/dashboard")).toBe(true);
    expect(isActive("/dashboard", "/today")).toBe(false);
    expect(isActive("/today", "/dashboard")).toBe(false);
  });
});

describe("Learn entry (#469)", () => {
  it("is listed directly under Stats, for the owner only", () => {
    expect(mainNav(false)).toBe(MAIN_NAV);
    const owner = mainNav(true).map((item) => item.href);
    expect(owner.slice(-2)).toEqual(["/stats", "/learn"]);
    expect(owner).toHaveLength(MAIN_NAV.length + 1);
  });
});
