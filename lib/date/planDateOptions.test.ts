import { describe, expect, it } from "vitest";
import { planDateOptions, planDueDateIso, toLocalDateKey } from "@/lib/date/planDateOptions";
import { localDate } from "@/lib/test/factories";

const keys = (date: Date) => planDateOptions(date).map((o) => o.key);
const labels = (date: Date) => planDateOptions(date).map((o) => o.label);

describe("planDateOptions (Plan for…, #183 / #282)", () => {
  it("offers Today, Tomorrow and the rest of the week on a weekday", () => {
    expect(keys(localDate(2026, 10, 7, 15, 30))).toEqual([
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    expect(planDateOptions(localDate(2026, 10, 5))).toHaveLength(7);
    expect(labels(localDate(2026, 10, 12))).toEqual([
      "Today",
      "Tomorrow",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    expect(labels(localDate(2026, 10, 16))).toEqual(["Today", "Tomorrow", "Sunday"]);
  });

  it("offers next week on the weekend, with 'Next' for repeated weekdays", () => {
    expect(labels(localDate(2026, 10, 17))).toEqual([
      "Today",
      "Tomorrow",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Next Saturday",
      "Next Sunday",
    ]);
    expect(labels(localDate(2026, 10, 18))).toEqual([
      "Today",
      "Tomorrow",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Next Sunday",
    ]);
    expect(new Set(keys(localDate(2026, 10, 17))).size).toBe(9);
  });

  it("crosses the year end", () => {
    expect(keys(localDate(2026, 12, 31))).toEqual([
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });
});

describe("planDueDateIso / toLocalDateKey", () => {
  it("plans for local midnight and round-trips the key", () => {
    const due = new Date(planDueDateIso("2026-10-09"));
    expect(toLocalDateKey(due)).toBe("2026-10-09");
    expect([due.getHours(), due.getMinutes()]).toEqual([0, 0]);
  });
});
