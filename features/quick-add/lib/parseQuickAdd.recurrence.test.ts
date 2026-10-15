import { describe, expect, it } from "vitest";
import type { RecurrenceRule } from "@/lib/types";
import { parseQuickAdd } from "@/features/quick-add/lib/parseQuickAdd";
import { localDate, localStamp } from "@/lib/test/factories";

const labels = [
  { id: "fam", name: "Family" },
  { id: "h", name: "Health" },
];
const WED = localDate(2026, 10, 7, 10); // Wed 7 Oct 2026 10:00
const p = (text: string, now = WED, ignored?: ReadonlySet<string>) =>
  parseQuickAdd(text, { now, labels, ignored, recurrence: true });

const rule = (o: Partial<RecurrenceRule> & Pick<RecurrenceRule, "frequency">): RecurrenceRule =>
  ({ interval: 1, endDate: null, ...o }) as RecurrenceRule;
const W = (days: number[], o: Partial<RecurrenceRule> = {}) =>
  rule({ frequency: "weekly", daysOfWeek: days, ...o });
const D = (o: Partial<RecurrenceRule> = {}) => rule({ frequency: "daily", ...o });
const DOM = (day: number, o: Partial<RecurrenceRule> = {}) =>
  rule({ frequency: "monthly", monthlyMode: "dayOfMonth", dayOfMonth: day, ...o });
const NTH = (n: number, weekday: number) =>
  rule({ frequency: "monthly", monthlyMode: "nthWeekday", nthWeekday: { n, weekday } });

// [input, title, rule, first occurrence, all day]
const cases: [string, string, RecurrenceRule, string, boolean][] = [
  ["Gym every monday 7am #health", "Gym", W([1]), "2026-10-12 7:00", false],
  ["Gym jeden Montag 7 Uhr", "Gym", W([1]), "2026-10-12 7:00", false],
  ["Water plants daily", "Water plants", D(), "2026-10-7 0:00", true],
  ["täglich gießen", "gießen", D(), "2026-10-7 0:00", true],
  ["Read every day", "Read", D(), "2026-10-7 0:00", true],
  ["Lesen jeden Tag", "Lesen", D(), "2026-10-7 0:00", true],
  ["x every 3 days", "x", D({ interval: 3 }), "2026-10-7 0:00", true],
  ["x alle 3 Tage", "x", D({ interval: 3 }), "2026-10-7 0:00", true],
  ["x every other day", "x", D({ interval: 2 }), "2026-10-7 0:00", true],
  ["x every 2 weeks", "x", W([3], { interval: 2 }), "2026-10-7 0:00", true],
  ["x alle 2 Wochen", "x", W([3], { interval: 2 }), "2026-10-7 0:00", true],
  ["x alle zwei Wochen", "x", W([3], { interval: 2 }), "2026-10-7 0:00", true],
  ["x jede zweite Woche", "x", W([3], { interval: 2 }), "2026-10-7 0:00", true],
  ["x weekly", "x", W([3]), "2026-10-7 0:00", true],
  ["x wöchentlich", "x", W([3]), "2026-10-7 0:00", true],
  ["x every mon and thu", "x", W([1, 4]), "2026-10-8 0:00", true],
  ["x every mon, wed, and fri", "x", W([1, 3, 5]), "2026-10-7 0:00", true],
  ["x jeden Mo, Do", "x", W([1, 4]), "2026-10-8 0:00", true],
  ["x jeden Montag und Donnerstag", "x", W([1, 4]), "2026-10-8 0:00", true],
  ["x on mondays", "x", W([1]), "2026-10-12 0:00", true],
  ["x montags und donnerstags", "x", W([1, 4]), "2026-10-8 0:00", true],
  ["x every weekday", "x", W([1, 2, 3, 4, 5]), "2026-10-7 0:00", true],
  ["x werktags", "x", W([1, 2, 3, 4, 5]), "2026-10-7 0:00", true],
  ["x every weekend", "x", W([0, 6]), "2026-10-10 0:00", true],
  ["x jedes Wochenende", "x", W([0, 6]), "2026-10-10 0:00", true],
  ["x every 2 weeks on tue", "x", W([2], { interval: 2 }), "2026-10-13 0:00", true],
  ["x alle 2 Wochen dienstags", "x", W([2], { interval: 2 }), "2026-10-13 0:00", true],
  ["x wöchentlich am Freitag", "x", W([5]), "2026-10-9 0:00", true],
  ["Pay rent monthly on the 1st", "Pay rent", DOM(1), "2026-11-1 0:00", true],
  ["Miete monatlich am 1.", "Miete", DOM(1), "2026-11-1 0:00", true],
  ["x monthly on the 15th", "x", DOM(15), "2026-10-15 0:00", true],
  ["x monatlich am 15.", "x", DOM(15), "2026-10-15 0:00", true],
  ["x every 15th", "x", DOM(15), "2026-10-15 0:00", true],
  ["x jeden 15.", "x", DOM(15), "2026-10-15 0:00", true],
  ["x jeden Monat am 15.", "x", DOM(15), "2026-10-15 0:00", true],
  ["x every month on the 15th", "x", DOM(15), "2026-10-15 0:00", true],
  ["x every 31st", "x", DOM(31), "2026-10-31 0:00", true],
  ["x monthly", "x", DOM(7), "2026-10-7 0:00", true],
  ["x every 3 months on the 1st", "x", DOM(1, { interval: 3 }), "2026-11-1 0:00", true],
  ["x alle 3 Monate am 1.", "x", DOM(1, { interval: 3 }), "2026-11-1 0:00", true],
  ["x every first monday", "x", NTH(1, 1), "2026-11-2 0:00", true],
  ["x jeden ersten Montag", "x", NTH(1, 1), "2026-11-2 0:00", true],
  ["x jeden 1. Montag", "x", NTH(1, 1), "2026-11-2 0:00", true],
  ["x every second monday", "x", NTH(2, 1), "2026-10-12 0:00", true],
  ["x jeden letzten Freitag", "x", NTH(-1, 5), "2026-10-30 0:00", true],
  ["x every last fri of the month", "x", NTH(-1, 5), "2026-10-30 0:00", true],
  ["x every month on the last friday", "x", NTH(-1, 5), "2026-10-30 0:00", true],
  ["x monatlich am letzten Freitag", "x", NTH(-1, 5), "2026-10-30 0:00", true],
  // time / start / end
  ["Standup every weekday 9:30", "Standup", W([1, 2, 3, 4, 5]), "2026-10-8 9:30", false],
  ["x every wed 11:00", "x", W([3]), "2026-10-7 11:00", false],
  ["x every day at 8am", "x", D(), "2026-10-8 8:00", false],
  ["x jeden Tag um 18 Uhr", "x", D(), "2026-10-7 18:00", false],
  ["x every mon until 31 Dec", "x", W([1], { endDate: "2026-12-31" }), "2026-10-12 0:00", true],
  ["x jeden Mo bis 31.12.", "x", W([1], { endDate: "2026-12-31" }), "2026-10-12 0:00", true],
  ["x jeden Mo bis zum 31.12.", "x", W([1], { endDate: "2026-12-31" }), "2026-10-12 0:00", true],
  [
    "Gym jeden Mo und Do 18 Uhr bis 31.12.",
    "Gym",
    W([1, 4], { endDate: "2026-12-31" }),
    "2026-10-8 18:00",
    false,
  ],
  ["Rent every 1st from 1.12.", "Rent", DOM(1), "2026-12-1 0:00", true],
  ["Miete jeden 1. ab 1.12.", "Miete", DOM(1), "2026-12-1 0:00", true],
  ["x weekly from 14 Oct", "x", W([3]), "2026-10-14 0:00", true],
  ["x every mon starting 19 Oct", "x", W([1]), "2026-10-19 0:00", true],
  [
    "x every mon from 19 Oct until 30 Nov",
    "x",
    W([1], { endDate: "2026-11-30" }),
    "2026-10-19 0:00",
    true,
  ],
  ["Call every mon and do the dishes", "Call and do the dishes", W([1]), "2026-10-12 0:00", true],
];

describe("parseQuickAdd with recurrence (#274)", () => {
  it.each(cases)("%j", (text, title, expectedRule, first, allDay) => {
    const r = p(text);
    expect(r.title).toBe(title);
    expect(r.recurrence).toEqual(expectedRule);
    expect(localStamp(r.dueDate)).toBe(first);
    expect(r.allDay).toBe(allDay);
  });

  it("keeps labels and priority next to a recurrence, and reports roles", () => {
    const r = p("Gym every monday 7am #health !high");
    expect([r.labelIds, r.priority]).toEqual([["h"], "high"]);
    expect(r.tokens.map((t) => [t.kind, t.text, "role" in t ? t.role : undefined])).toEqual([
      ["recurrence", "every monday", undefined],
      ["date", "7am", "start"],
      ["label", "#health", undefined],
      ["priority", "!high", undefined],
    ]);
    expect(r.tokens[0].id).toBe("recurrence:every monday");
    const end = p("x jeden Mo bis 31.12.");
    expect(end.tokens.map((t) => [t.kind, t.text, "role" in t ? t.role : undefined])).toEqual([
      ["recurrence", "jeden Mo", undefined],
      ["date", "bis 31.12.", "end"],
    ]);
  });

  it.each(["every time I call", "Review each PR", "alle Aufgaben"])(
    "%j is not a recurrence",
    (text) => {
      const r = p(text);
      expect([r.recurrence, r.title]).toEqual([null, text]);
    },
  );

  it("reads a plural weekday as weekly (documented)", () => {
    expect(p("Mondays meeting notes?").recurrence?.daysOfWeek).toEqual([1]);
  });

  it("'bis' without a recurrence is still a due date", () => {
    const r = p("Report bis Freitag");
    expect([
      r.recurrence,
      r.title,
      localStamp(r.dueDate),
      "role" in r.tokens[0] ? r.tokens[0].role : null,
    ]).toEqual([null, "Report", "2026-10-9 0:00", "due"]);
  });

  it("ignoring the recurrence keeps the phrase and makes the time a due date", () => {
    const r = p("Gym every monday 7am", WED, new Set(["recurrence:every monday"]));
    expect([r.recurrence, r.title, localStamp(r.dueDate)]).toEqual([
      null,
      "Gym every monday",
      "2026-10-8 7:00",
    ]);
    expect(r.ignoredTokens.map((t) => t.id)).toEqual(["recurrence:every monday"]);
  });

  it("ignoring the time makes an all-day series", () => {
    const r = p("Gym every monday 7am", WED, new Set(["date:7am"]));
    expect([r.recurrence?.daysOfWeek, localStamp(r.dueDate), r.allDay, r.title]).toEqual([
      [1],
      "2026-10-12 0:00",
      true,
      "Gym 7am",
    ]);
  });

  it("an end before the start creates no series", () => {
    const r = p("x jeden Mo bis 1.10.2026");
    expect([r.recurrence, r.dueDate, r.title]).toEqual([null, null, "x jeden Mo bis 1.10.2026"]);
  });

  it("skips a time already past today, but keeps a later one", () => {
    expect(localStamp(p("Gym every monday 7am", localDate(2026, 10, 12, 19)).dueDate)).toBe(
      "2026-10-19 7:00",
    );
    expect(localStamp(p("Gym every monday 7pm", localDate(2026, 10, 12, 8)).dueDate)).toBe(
      "2026-10-12 19:00",
    );
  });
});
