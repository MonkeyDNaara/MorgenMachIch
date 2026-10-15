import { describe, expect, it } from "vitest";
import {
  dayOffset,
  formatDateFieldValue,
  moveDateFocus,
  quickDateOptions,
  relativeDayLabel,
} from "@/lib/date/dateField";
import { parseDateText } from "@/lib/date/parseDate";
import { toLocalDateKey } from "@/lib/date/planDateOptions";
import { localDate } from "@/lib/test/factories";

const SUNDAY = localDate(2026, 10, 11, 14);

describe("formatDateFieldValue", () => {
  it("formats in APP_LOCALE without the comma after the weekday", () => {
    expect(formatDateFieldValue("2026-10-16")).toBe("Fri 16 Oct 2026");
    expect(formatDateFieldValue("2027-01-01")).toBe("Fri 1 Jan 2027");
  });

  it.each(["2026-10-16", "2026-12-31", "2027-02-28", "2026-03-29", "2026-11-01"])(
    "round-trips %s through the parser",
    (key) => {
      expect(toLocalDateKey(parseDateText(formatDateFieldValue(key), SUNDAY)!)).toBe(key);
    },
  );
});

describe("relativeDayLabel", () => {
  it.each([
    ["2026-10-11", "today"],
    ["2026-10-12", "tomorrow"],
    ["2026-10-10", "yesterday"],
    ["2026-10-16", "in 5 days"],
    ["2026-10-07", "4 days ago"],
    ["2026-10-24", "in 13 days"],
    ["2026-10-25", "in 2 weeks"],
    ["2026-11-01", "in 3 weeks"],
    ["2026-12-10", "in 2 months"],
    ["2026-08-01", "2 months ago"],
  ])("%s → %s", (key, expected) => {
    expect(relativeDayLabel(key, SUNDAY)).toBe(expected);
  });
});

describe("dayOffset", () => {
  it("counts calendar days across DST changes", () => {
    expect(dayOffset(localDate(2026, 10, 25, 23), localDate(2026, 10, 24, 1))).toBe(1);
    expect(dayOffset(localDate(2026, 3, 30), localDate(2026, 3, 28, 23))).toBe(2);
  });
});

describe("quickDateOptions", () => {
  // Mon 5 … Sun 11 Oct 2026: [weekend, next week]
  const expected: Record<number, [string, string]> = {
    1: ["2026-10-10", "2026-10-12"],
    2: ["2026-10-10", "2026-10-12"],
    3: ["2026-10-10", "2026-10-12"],
    4: ["2026-10-10", "2026-10-12"],
    5: ["2026-10-10", "2026-10-12"],
    6: ["2026-10-17", "2026-10-12"],
    0: ["2026-10-17", "2026-10-12"],
  };

  it.each([5, 6, 7, 8, 9, 10, 11])("Oct %i: Today, Tomorrow, Weekend, Next week", (day) => {
    const now = localDate(2026, 10, day, 9);
    const options = quickDateOptions(now);
    expect(options.map((o) => o.id)).toEqual(["today", "tomorrow", "weekend", "next-week"]);
    expect(options[0].key).toBe(toLocalDateKey(localDate(2026, 10, day)));
    expect(options[1].key).toBe(toLocalDateKey(localDate(2026, 10, day + 1)));
    expect([options[2].key, options[3].key]).toEqual(expected[now.getDay()]);
  });

  it("crosses the year end", () => {
    expect(quickDateOptions(localDate(2026, 12, 31)).map((o) => o.key)).toEqual([
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-04",
    ]);
  });
});

describe("moveDateFocus (month grid keyboard)", () => {
  const WED = localDate(2026, 10, 14);
  const move = (key: string, date: Date) => toLocalDateKey(moveDateFocus(key, date)!);

  it("moves by day and week", () => {
    expect(move("ArrowLeft", WED)).toBe("2026-10-13");
    expect(move("ArrowRight", WED)).toBe("2026-10-15");
    expect(move("ArrowUp", WED)).toBe("2026-10-07");
    expect(move("ArrowDown", WED)).toBe("2026-10-21");
  });

  it("jumps to the Monday-first week's ends", () => {
    expect(move("Home", WED)).toBe("2026-10-12");
    expect(move("End", WED)).toBe("2026-10-18");
    expect(move("Home", localDate(2026, 10, 12))).toBe("2026-10-12");
    expect(move("End", localDate(2026, 10, 18))).toBe("2026-10-18");
  });

  it("pages by month and clamps the day", () => {
    expect(move("PageDown", localDate(2027, 1, 31))).toBe("2027-02-28");
    expect(move("PageUp", localDate(2026, 3, 31))).toBe("2026-02-28");
    expect(move("PageDown", localDate(2026, 12, 15))).toBe("2027-01-15");
    expect(move("PageUp", localDate(2026, 1, 15))).toBe("2025-12-15");
  });

  it("crosses DST and month ends by day and week", () => {
    expect(move("ArrowRight", localDate(2026, 10, 24))).toBe("2026-10-25");
    expect(move("ArrowDown", localDate(2026, 10, 24))).toBe("2026-10-31");
    expect(move("ArrowDown", localDate(2026, 3, 26))).toBe("2026-04-02");
  });

  it("ignores other keys", () => {
    expect(moveDateFocus("Enter", WED)).toBeNull();
    expect(moveDateFocus("a", WED)).toBeNull();
  });
});
