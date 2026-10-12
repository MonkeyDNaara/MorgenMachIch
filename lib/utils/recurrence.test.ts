import { describe, expect, it } from "vitest";
import {
  computeMonthlyDefaults,
  occurrenceDueIso,
  occurrencesBetween,
} from "@/lib/utils/recurrence";
import { dayKey, localDate, localIso, rule } from "@/lib/test/factories";

/** Occurrence days of `r` (anchored at `start`) after `from` up to `to`, as "YYYY-MM-DD". */
function days(r: Parameters<typeof occurrencesBetween>[0], start: Date, from: Date, to: Date) {
  return occurrencesBetween(r, start, from, to).map(dayKey);
}

describe("occurrencesBetween — daily", () => {
  it("lists every day strictly after `from` up to and including the horizon", () => {
    const start = localDate(2026, 10, 1);
    expect(
      days(rule({ frequency: "daily" }), start, localDate(2026, 10, 5), localDate(2026, 10, 8)),
    ).toEqual(["2026-10-06", "2026-10-07", "2026-10-08"]);
  });

  it("counts the interval from the start date", () => {
    const start = localDate(2026, 10, 1);
    expect(
      days(
        rule({ frequency: "daily", interval: 3 }),
        start,
        localDate(2026, 9, 30),
        localDate(2026, 10, 12),
      ),
    ).toEqual(["2026-10-01", "2026-10-04", "2026-10-07", "2026-10-10"]);
  });

  it("never starts before the start date", () => {
    const start = localDate(2026, 10, 10);
    expect(
      days(rule({ frequency: "daily" }), start, localDate(2026, 10, 1), localDate(2026, 10, 11)),
    ).toEqual(["2026-10-10", "2026-10-11"]);
  });

  it("keeps the interval across the EU and US DST changes", () => {
    const start = localDate(2026, 10, 20);
    expect(
      days(
        rule({ frequency: "daily", interval: 2 }),
        start,
        localDate(2026, 10, 19),
        localDate(2026, 11, 3),
      ),
    ).toEqual([
      "2026-10-20",
      "2026-10-22",
      "2026-10-24",
      "2026-10-26",
      "2026-10-28",
      "2026-10-30",
      "2026-11-01",
      "2026-11-03",
    ]);
  });
});

describe("occurrencesBetween — end date (#279)", () => {
  it("includes the end day itself", () => {
    const r = rule({ frequency: "daily", endDate: "2026-12-31" });
    const result = occurrencesBetween(
      r,
      localDate(2026, 12, 20),
      localDate(2026, 12, 19),
      localDate(2027, 1, 31),
    );
    expect(result).toHaveLength(12);
    expect(dayKey(result.at(-1)!)).toBe("2026-12-31");
  });

  it("includes the end day for weekly rules", () => {
    const r = rule({ frequency: "weekly", daysOfWeek: [4], endDate: "2026-12-31" });
    expect(days(r, localDate(2026, 12, 1), localDate(2026, 11, 30), localDate(2027, 2, 1))).toEqual(
      ["2026-12-03", "2026-12-10", "2026-12-17", "2026-12-24", "2026-12-31"],
    );
  });

  it("stops at the horizon when it comes before the end date", () => {
    const r = rule({ frequency: "daily", endDate: "2027-06-30" });
    expect(days(r, localDate(2026, 10, 1), localDate(2026, 10, 1), localDate(2026, 10, 3))).toEqual(
      ["2026-10-02", "2026-10-03"],
    );
  });
});

describe("occurrencesBetween — weekly", () => {
  it("matches the listed weekdays (0 = Sunday)", () => {
    const r = rule({ frequency: "weekly", daysOfWeek: [1, 4] });
    expect(
      days(r, localDate(2026, 10, 5), localDate(2026, 10, 4), localDate(2026, 10, 18)),
    ).toEqual(["2026-10-05", "2026-10-08", "2026-10-12", "2026-10-15"]);
  });

  it("counts every-2-weeks from the start's Monday-based week", () => {
    // Started on a Wednesday: that week is week zero, so Mon 5 Oct is skipped.
    const r = rule({ frequency: "weekly", interval: 2, daysOfWeek: [1, 3] });
    expect(
      days(r, localDate(2026, 10, 7), localDate(2026, 10, 1), localDate(2026, 10, 31)),
    ).toEqual(["2026-10-07", "2026-10-19", "2026-10-21"]);
  });

  it("treats Sunday as the end of the week, not the start", () => {
    const r = rule({ frequency: "weekly", interval: 2, daysOfWeek: [0] });
    // Mon 5 Oct starts week zero; its Sunday is 11 Oct, the next one counted is 25 Oct.
    expect(
      days(r, localDate(2026, 10, 5), localDate(2026, 10, 4), localDate(2026, 10, 31)),
    ).toEqual(["2026-10-11", "2026-10-25"]);
  });

  it("keeps the two-week rhythm across the DST weekends", () => {
    const r = rule({ frequency: "weekly", interval: 2, daysOfWeek: [1] });
    expect(
      days(r, localDate(2026, 10, 12), localDate(2026, 10, 11), localDate(2026, 11, 30)),
    ).toEqual(["2026-10-12", "2026-10-26", "2026-11-09", "2026-11-23"]);
  });
});

describe("occurrencesBetween — monthly", () => {
  it("day of month", () => {
    const r = rule({ frequency: "monthly", monthlyMode: "dayOfMonth", dayOfMonth: 15 });
    expect(
      days(r, localDate(2026, 10, 15), localDate(2026, 10, 1), localDate(2027, 1, 31)),
    ).toEqual(["2026-10-15", "2026-11-15", "2026-12-15", "2027-01-15"]);
  });

  it("skips months without that day (the 31st)", () => {
    const r = rule({ frequency: "monthly", monthlyMode: "dayOfMonth", dayOfMonth: 31 });
    expect(
      days(r, localDate(2026, 10, 31), localDate(2026, 10, 1), localDate(2027, 3, 31)),
    ).toEqual(["2026-10-31", "2026-12-31", "2027-01-31", "2027-03-31"]);
  });

  it("every 3 months counts from the start month", () => {
    const r = rule({ frequency: "monthly", interval: 3, monthlyMode: "dayOfMonth", dayOfMonth: 1 });
    expect(days(r, localDate(2026, 11, 1), localDate(2026, 10, 1), localDate(2027, 8, 31))).toEqual(
      ["2026-11-01", "2027-02-01", "2027-05-01", "2027-08-01"],
    );
  });

  it("nth weekday: first Monday", () => {
    const r = rule({
      frequency: "monthly",
      monthlyMode: "nthWeekday",
      nthWeekday: { n: 1, weekday: 1 },
    });
    expect(days(r, localDate(2026, 10, 1), localDate(2026, 10, 1), localDate(2027, 1, 31))).toEqual(
      ["2026-10-05", "2026-11-02", "2026-12-07", "2027-01-04"],
    );
  });

  it("nth weekday: last Friday, also in a month with five Fridays", () => {
    const r = rule({
      frequency: "monthly",
      monthlyMode: "nthWeekday",
      nthWeekday: { n: -1, weekday: 5 },
    });
    expect(days(r, localDate(2026, 10, 1), localDate(2026, 10, 1), localDate(2027, 1, 31))).toEqual(
      ["2026-10-30", "2026-11-27", "2026-12-25", "2027-01-29"],
    );
  });

  it("nth weekday: fourth Thursday is never the fifth one", () => {
    const r = rule({
      frequency: "monthly",
      monthlyMode: "nthWeekday",
      nthWeekday: { n: 4, weekday: 4 },
    });
    // October 2026 has five Thursdays (1, 8, 15, 22, 29).
    expect(
      days(r, localDate(2026, 10, 1), localDate(2026, 9, 30), localDate(2026, 11, 30)),
    ).toEqual(["2026-10-22", "2026-11-26"]);
  });
});

describe("computeMonthlyDefaults", () => {
  it("uses the day of month and its occurrence of the weekday", () => {
    expect(computeMonthlyDefaults(localIso(2026, 10, 15))).toEqual({
      dayOfMonth: 15,
      nthWeekday: { n: 3, weekday: 4 },
    });
  });

  it("calls the final weekday of a month 'last' (-1)", () => {
    expect(computeMonthlyDefaults(localIso(2026, 10, 30)).nthWeekday).toEqual({
      n: -1,
      weekday: 5,
    });
    expect(computeMonthlyDefaults(localIso(2026, 10, 31)).nthWeekday).toEqual({
      n: -1,
      weekday: 6,
    });
    // Sat 24 Oct is the fourth Saturday, not the last.
    expect(computeMonthlyDefaults(localIso(2026, 10, 24)).nthWeekday).toEqual({ n: 4, weekday: 6 });
  });
});

describe("occurrenceDueIso", () => {
  it("keeps the series' time of day on the occurrence day", () => {
    const series = { startDate: localIso(2026, 9, 1, 9, 30), allDay: false };
    expect(occurrenceDueIso(series, localDate(2026, 12, 1))).toBe(localIso(2026, 12, 1, 9, 30));
  });

  it("uses local midnight for all-day series", () => {
    const series = { startDate: localIso(2026, 9, 1, 9, 30), allDay: true };
    expect(occurrenceDueIso(series, localDate(2026, 12, 1))).toBe(localIso(2026, 12, 1));
  });

  it("keeps 09:00 on the day after a DST change", () => {
    const series = { startDate: localIso(2026, 10, 1, 9), allDay: false };
    expect(occurrenceDueIso(series, localDate(2026, 10, 26))).toBe(localIso(2026, 10, 26, 9));
    expect(occurrenceDueIso(series, localDate(2026, 11, 2))).toBe(localIso(2026, 11, 2, 9));
  });
});
