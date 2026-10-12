import { describe, expect, it } from "vitest";
import { isStorageError } from "@/lib/utils/isStorageError";

const named = (name: string, message = "x") => Object.assign(new Error(message), { name });

describe("isStorageError (#177)", () => {
  it.each([
    "OpenFailedError",
    "DatabaseClosedError",
    "MissingAPIError",
    "QuotaExceededError",
    "SecurityError",
    "InvalidStateError",
    "VersionError",
  ])("recognises %s", (name) => {
    expect(isStorageError(named(name))).toBe(true);
  });

  it("recognises a message that mentions IndexedDB", () => {
    expect(isStorageError(new Error("IndexedDB API missing"))).toBe(true);
  });

  it.each([
    ["a generic Error", new Error("boom")],
    ["a TypeError", new TypeError("x is undefined")],
    ["a plain string", "OpenFailedError"],
    ["null", null],
    ["undefined", undefined],
  ])("ignores %s", (_name, value) => {
    expect(isStorageError(value)).toBe(false);
  });
});
