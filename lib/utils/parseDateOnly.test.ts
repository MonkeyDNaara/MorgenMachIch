import { describe, expect, it } from "vitest";
import { parseDateOnly } from "@/lib/utils/parseDateOnly";
import { dayKey } from "@/lib/test/factories";

describe("parseDateOnly", () => {
  it("reads a date-only string as local midnight, not UTC (#279)", () => {
    const date = parseDateOnly("2026-12-31");
    expect(dayKey(date)).toBe("2026-12-31");
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0]);
  });

  it("handles a year boundary", () => {
    expect(dayKey(parseDateOnly("2027-01-01"))).toBe("2027-01-01");
  });

  it("passes full ISO strings (older data) to new Date unchanged", () => {
    const iso = new Date(2026, 11, 31).toISOString();
    expect(dayKey(parseDateOnly(iso))).toBe("2026-12-31");
  });
});
