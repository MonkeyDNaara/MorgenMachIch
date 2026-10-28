import { describe, expect, it } from "vitest";
import { cleanCode, formatCountdown, initialOf, nameFromEmail, safeNextPath } from "./authInput";

describe("nameFromEmail (#445)", () => {
  it("uses the part before the @", () => {
    expect(nameFromEmail(" niko.klam@example.com ")).toBe("niko.klam");
    expect(nameFromEmail("@example.com")).toBe("User");
    expect(nameFromEmail("x".repeat(80) + "@a.de")).toHaveLength(50);
  });
});

describe("cleanCode", () => {
  it("keeps up to six digits", () => {
    expect(cleanCode("483 921")).toBe("483921");
    expect(cleanCode("12-34-56-78")).toBe("123456");
    expect(cleanCode("abc")).toBe("");
  });
});

describe("safeNextPath", () => {
  it("allows paths inside the app", () => {
    expect(safeNextPath("/tasks")).toBe("/tasks");
    expect(safeNextPath("/today?sample=1")).toBe("/today?sample=1");
  });

  it("falls back to /today for anything else", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/api/auth/sign-out",
      "/sign-in",
      "/sign-up?verify=a",
      "/today\nSet-Cookie:x",
    ]) {
      expect(safeNextPath(bad), String(bad)).toBe("/today");
    }
  });
});

describe("formatCountdown", () => {
  it("shows minutes and seconds", () => {
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(42)).toBe("0:42");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});

describe("initialOf", () => {
  it("is the email's first letter, upper-case", () => {
    expect(initialOf("niko@example.com")).toBe("N");
    expect(initialOf("  ")).toBe("?");
  });
});
