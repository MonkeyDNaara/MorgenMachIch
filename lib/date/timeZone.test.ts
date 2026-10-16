import { describe, expect, it } from "vitest";
import { isValidTimeZone } from "@/lib/date/timeZone";

describe("isValidTimeZone", () => {
  it.each(["Europe/Berlin", "America/New_York", "Asia/Kolkata", "UTC"])("accepts %s", (zone) => {
    expect(isValidTimeZone(zone)).toBe(true);
  });

  it.each(["", " ", "Mars/Base", "Europe/Berlinn", "GMT+25"])("rejects %j", (zone) => {
    expect(isValidTimeZone(zone)).toBe(false);
  });
});
