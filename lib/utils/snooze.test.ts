import { describe, expect, it } from "vitest";
import { snoozeToTomorrow } from "@/lib/utils/snooze";
import { localDate, localIso } from "@/lib/test/factories";

const NOW = localDate(2026, 10, 9, 10); // Fri 9 Oct 10:00

describe("snoozeToTomorrow (→ Morgen, #239)", () => {
  it("moves a timed task to tomorrow and keeps the time", () => {
    expect(snoozeToTomorrow(localIso(2026, 10, 9, 15), false, NOW)).toBe(
      localIso(2026, 10, 10, 15),
    );
  });

  it("counts from today, not from the old due date", () => {
    expect(snoozeToTomorrow(localIso(2026, 10, 4, 9, 30), false, NOW)).toBe(
      localIso(2026, 10, 10, 9, 30),
    );
  });

  it("keeps all-day tasks at local midnight", () => {
    expect(snoozeToTomorrow(localIso(2026, 10, 7), true, NOW)).toBe(localIso(2026, 10, 10));
  });

  it("works late in the evening", () => {
    expect(snoozeToTomorrow(localIso(2026, 10, 9, 8), false, localDate(2026, 10, 9, 23, 30))).toBe(
      localIso(2026, 10, 10, 8),
    );
  });

  it("crosses month and year ends", () => {
    expect(snoozeToTomorrow(localIso(2026, 10, 31, 18), false, localDate(2026, 10, 31, 12))).toBe(
      localIso(2026, 11, 1, 18),
    );
    expect(snoozeToTomorrow(localIso(2026, 12, 31), true, localDate(2026, 12, 31, 20))).toBe(
      localIso(2027, 1, 1),
    );
  });

  it("keeps the time across the EU and US DST changes", () => {
    expect(snoozeToTomorrow(localIso(2026, 10, 24, 9), false, localDate(2026, 10, 24, 12))).toBe(
      localIso(2026, 10, 25, 9),
    );
    expect(snoozeToTomorrow(localIso(2027, 3, 7, 9), false, localDate(2027, 3, 7, 12))).toBe(
      localIso(2027, 3, 8, 9),
    );
  });
});
