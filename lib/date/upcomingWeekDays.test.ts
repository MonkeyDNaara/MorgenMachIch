import { describe, expect, it } from "vitest";
import { upcomingWeekDays } from "@/lib/date/upcomingWeekDays";
import { dayKey, localDate } from "@/lib/test/factories";

const days = (y: number, m: number, d: number, h = 10) =>
  upcomingWeekDays(localDate(y, m, d, h)).map(dayKey);

describe("upcomingWeekDays (Coming up strip, #130 / #282)", () => {
  it("runs from tomorrow to this Sunday on a weekday", () => {
    expect(days(2026, 10, 12)).toEqual([
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(days(2026, 10, 15)).toEqual(["2026-10-16", "2026-10-17", "2026-10-18"]);
    expect(days(2026, 10, 16)).toEqual(["2026-10-17", "2026-10-18"]);
  });

  it("shows Sunday plus all of next week on a Saturday", () => {
    expect(days(2026, 10, 17)).toEqual([
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
  });

  it("shows all of next week on a Sunday, at any time of day", () => {
    const sunday = [
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ];
    expect(days(2026, 10, 18)).toEqual(sunday);
    expect(days(2026, 10, 18, 23)).toEqual(sunday);
    expect(days(2026, 10, 17, 0)).toHaveLength(8);
  });

  it("crosses month and year ends", () => {
    expect(days(2026, 12, 26)).toEqual([
      "2026-12-27",
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(days(2027, 1, 31)[0]).toBe("2027-02-01");
    expect(days(2027, 1, 31).at(-1)).toBe("2027-02-07");
  });

  it("is unaffected by the EU and US DST weekends", () => {
    expect(days(2026, 10, 24)).toHaveLength(8);
    expect(days(2026, 10, 31).at(-1)).toBe("2026-11-08");
  });

  it.each([12, 13, 14, 15, 16, 17, 18])(
    "starts tomorrow, ends on a Sunday, at midnight (Oct %i)",
    (day) => {
      const list = upcomingWeekDays(localDate(2026, 10, day, 12));
      expect(dayKey(list[0])).toBe(dayKey(localDate(2026, 10, day + 1)));
      expect(list.at(-1)!.getDay()).toBe(0);
      expect(list.every((d) => d.getHours() === 0 && d.getMinutes() === 0)).toBe(true);
    },
  );
});
