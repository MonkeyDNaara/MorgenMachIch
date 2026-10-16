import { describe, expect, it } from "vitest";
import { localDayIn, planOccurrences, startOfLocalDay } from "@/lib/domain/occurrencePlan";
import type { RecurrenceRule } from "@/lib/types";

/**
 * All instants are fixed UTC strings, so these results must be identical in every runtime
 * time zone CI runs them in — the user's zone is the parameter, not the machine's.
 */
const daily: RecurrenceRule = { frequency: "daily", interval: 1 };
const at = (iso: string) => new Date(iso);
const plan = (
  startDate: string,
  timeZone: string,
  now: string,
  horizonDays: number,
  options: { allDay?: boolean; recurrence?: RecurrenceRule } = {},
) =>
  planOccurrences(
    { startDate, allDay: options.allDay ?? false, recurrence: options.recurrence ?? daily },
    timeZone,
    at(now),
    horizonDays,
  );

describe("planOccurrences", () => {
  it("uses the user's local day, not the server's UTC day", () => {
    // 22:30 UTC on the 16th is already 00:30 on the 17th in Berlin.
    expect(plan("2026-10-01T06:00:00Z", "Europe/Berlin", "2026-10-16T22:30:00Z", 3)).toEqual([
      { occurrenceDate: "2026-10-17", dueDate: "2026-10-17T06:00:00.000Z" },
      { occurrenceDate: "2026-10-18", dueDate: "2026-10-18T06:00:00.000Z" },
      { occurrenceDate: "2026-10-19", dueDate: "2026-10-19T06:00:00.000Z" },
      { occurrenceDate: "2026-10-20", dueDate: "2026-10-20T06:00:00.000Z" },
    ]);
  });

  it("keeps the local time of day across the autumn DST switch (Berlin, 25 Oct)", () => {
    const result = plan("2026-10-01T06:00:00Z", "Europe/Berlin", "2026-10-24T10:00:00Z", 2);
    expect(result.map((o) => o.dueDate)).toEqual([
      "2026-10-24T06:00:00.000Z", // 08:00 CEST
      "2026-10-25T07:00:00.000Z", // 08:00 CET
      "2026-10-26T07:00:00.000Z",
    ]);
  });

  it("moves a time in the spring-forward gap forward (Berlin, 28 Mar 2027)", () => {
    const result = plan("2027-03-01T01:30:00Z", "Europe/Berlin", "2027-03-27T12:00:00Z", 1);
    expect(result).toEqual([
      { occurrenceDate: "2027-03-27", dueDate: "2027-03-27T01:30:00.000Z" }, // 02:30 CET
      { occurrenceDate: "2027-03-28", dueDate: "2027-03-28T01:30:00.000Z" }, // 03:30 CEST
    ]);
  });

  it("matches weekdays in the user's zone (Kolkata, +05:30)", () => {
    // Sunday 20:00 UTC is Monday 01:30 in Kolkata.
    const result = plan("2026-10-05T03:30:00Z", "Asia/Kolkata", "2026-10-18T20:00:00Z", 7, {
      recurrence: { frequency: "weekly", interval: 1, daysOfWeek: [1] },
    });
    expect(result).toEqual([
      { occurrenceDate: "2026-10-19", dueDate: "2026-10-19T03:30:00.000Z" },
      { occurrenceDate: "2026-10-26", dueDate: "2026-10-26T03:30:00.000Z" },
    ]);
  });

  it("puts all-day occurrences at local midnight, across DST (Los Angeles, 1 Nov)", () => {
    const result = plan("2026-10-01T07:00:00Z", "America/Los_Angeles", "2026-10-31T12:00:00Z", 2, {
      allDay: true,
    });
    expect(result).toEqual([
      { occurrenceDate: "2026-10-31", dueDate: "2026-10-31T07:00:00.000Z" },
      { occurrenceDate: "2026-11-01", dueDate: "2026-11-01T07:00:00.000Z" },
      { occurrenceDate: "2026-11-02", dueDate: "2026-11-02T08:00:00.000Z" },
    ]);
  });

  it("starts at the series' start day when it lies in the future", () => {
    const result = plan("2026-11-10T07:00:00Z", "Europe/Berlin", "2026-10-17T10:00:00Z", 30);
    expect(result[0].occurrenceDate).toBe("2026-11-10");
    expect(result.at(-1)?.occurrenceDate).toBe("2026-11-16");
  });

  it("doesn't backfill days before today and stops at the horizon", () => {
    const result = plan("2026-01-01T07:00:00Z", "Europe/Berlin", "2026-10-17T10:00:00Z", 60);
    expect(result[0].occurrenceDate).toBe("2026-10-17");
    expect(result).toHaveLength(61);
  });
});

describe("localDayIn", () => {
  it("is the calendar day in that zone", () => {
    const now = at("2026-10-16T22:30:00Z");
    expect(localDayIn("Europe/Berlin", now)).toBe("2026-10-17");
    expect(localDayIn("America/New_York", now)).toBe("2026-10-16");
    expect(localDayIn("UTC", now)).toBe("2026-10-16");
  });
});

describe("startOfLocalDay", () => {
  it("is local midnight of the user's day as an instant", () => {
    const now = at("2026-10-16T22:30:00Z");
    expect(startOfLocalDay("Europe/Berlin", now).toISOString()).toBe("2026-10-16T22:00:00.000Z");
    expect(startOfLocalDay("Asia/Kolkata", now).toISOString()).toBe("2026-10-16T18:30:00.000Z");
    expect(startOfLocalDay("America/Los_Angeles", now).toISOString()).toBe(
      "2026-10-16T07:00:00.000Z",
    );
  });
});
