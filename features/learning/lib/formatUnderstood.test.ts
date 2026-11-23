import { describe, expect, it } from "vitest";
import { formatUnderstoodOn } from "@/features/learning/lib/formatUnderstood";

describe("formatUnderstoodOn", () => {
  it("formats the day as day and short month", () => {
    expect(formatUnderstoodOn("2026-11-12T09:00:00.000Z")).toBe("12 Nov");
  });

  it("uses Europe/Berlin, not the device zone (winter, UTC+1)", () => {
    expect(formatUnderstoodOn("2026-11-12T23:30:00.000Z")).toBe("13 Nov");
    expect(formatUnderstoodOn("2026-11-12T22:59:00.000Z")).toBe("12 Nov");
  });

  it("follows summer time (UTC+2)", () => {
    expect(formatUnderstoodOn("2026-06-30T22:30:00.000Z")).toBe("1 Jul");
    expect(formatUnderstoodOn("2026-06-30T21:59:00.000Z")).toBe("30 Jun");
  });
});
