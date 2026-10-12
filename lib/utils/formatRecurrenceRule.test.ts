import { describe, expect, it } from "vitest";
import { formatRecurrenceRule } from "@/lib/utils/formatRecurrenceRule";
import { rule } from "@/lib/test/factories";

describe("formatRecurrenceRule (#62)", () => {
  it.each([
    [rule({ frequency: "daily" }), "Every day"],
    [rule({ frequency: "daily", interval: 3 }), "Every 3 days"],
    [rule({ frequency: "weekly", daysOfWeek: [0, 3, 1] }), "Every week on Mon, Wed, Sun"],
    [rule({ frequency: "weekly", interval: 2, daysOfWeek: [2] }), "Every 2 weeks on Tue"],
    [
      rule({ frequency: "monthly", monthlyMode: "dayOfMonth", dayOfMonth: 1 }),
      "Every month on the 1st",
    ],
    [
      rule({ frequency: "monthly", monthlyMode: "dayOfMonth", dayOfMonth: 2 }),
      "Every month on the 2nd",
    ],
    [
      rule({ frequency: "monthly", monthlyMode: "dayOfMonth", dayOfMonth: 23 }),
      "Every month on the 23rd",
    ],
    [
      rule({ frequency: "monthly", monthlyMode: "dayOfMonth", dayOfMonth: 11 }),
      "Every month on the 11th",
    ],
    [
      rule({ frequency: "monthly", interval: 3, monthlyMode: "dayOfMonth", dayOfMonth: 15 }),
      "Every 3 months on the 15th",
    ],
    [
      rule({ frequency: "monthly", monthlyMode: "nthWeekday", nthWeekday: { n: 1, weekday: 1 } }),
      "Every month on the first Mon",
    ],
    [
      rule({ frequency: "monthly", monthlyMode: "nthWeekday", nthWeekday: { n: -1, weekday: 5 } }),
      "Every month on the last Fri",
    ],
  ])("%o → %s", (r, expected) => {
    expect(formatRecurrenceRule(r)).toBe(expected);
  });

  it("appends the end date as a local day (#279)", () => {
    expect(formatRecurrenceRule(rule({ frequency: "daily", endDate: "2026-12-31" }))).toBe(
      "Every day · until 31 Dec 2026",
    );
    expect(formatRecurrenceRule(rule({ frequency: "daily", endDate: "2027-01-01" }))).toBe(
      "Every day · until 1 Jan 2027",
    );
  });
});
