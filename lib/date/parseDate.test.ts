import { describe, expect, it } from "vitest";
import { parseDateText } from "@/lib/date/parseDate";
import { dayKey, localDate } from "@/lib/test/factories";

const SUNDAY = localDate(2026, 10, 11, 14);
const parse = (text: string) => {
  const date = parseDateText(text, SUNDAY);
  return date && dayKey(date);
};

describe("parseDateText (typed dates in the DateField, #258)", () => {
  it.each([
    ["fri", "2026-10-16"],
    ["tomorrow", "2026-10-12"],
    ["today", "2026-10-11"],
    ["sun", "2026-10-11"], // a bare weekday that is today means today
    ["in 3 weeks", "2026-11-01"],
    ["in 2 wochen", "2026-10-25"],
    ["12.10.", "2026-10-12"],
    ["übermorgen", "2026-10-13"],
    ["morgen", "2026-10-12"],
    ["16 Oct 2026", "2026-10-16"],
    ["Fri 16 Oct 2026", "2026-10-16"],
    ["20/10", "2026-10-20"],
    ["2026-10-20", "2026-10-20"],
    ["  fri  ", "2026-10-16"],
    ["fri 3pm", "2026-10-16"],
  ])("reads %j as %s", (text, expected) => {
    expect(parse(text)).toBe(expected);
  });

  it("returns local midnight even when a time was typed", () => {
    const date = parseDateText("fri 3pm", SUNDAY)!;
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0]);
  });

  it.each([
    "",
    "   ",
    "3pm",
    "someday maybe",
    "call mom fri",
    "fri and mon",
    "#family",
    "Do",
    "1 hour",
    "v2.10",
  ])("rejects %j", (text) => {
    expect(parseDateText(text, SUNDAY)).toBeNull();
  });
});
