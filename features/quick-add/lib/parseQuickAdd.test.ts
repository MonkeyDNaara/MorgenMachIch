import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "@/features/quick-add/lib/parseQuickAdd";
import { localDate, localStamp } from "@/lib/test/factories";

const labels = [
  { id: "fam", name: "Family" },
  { id: "dw", name: "Deep work" },
  { id: "w", name: "work" },
];
const WED = localDate(2026, 10, 7, 10); // Wed 7 Oct 2026 10:00
const FRI_EVENING = localDate(2026, 10, 9, 17);
const p = (text: string, now = WED, ignored?: ReadonlySet<string>) =>
  parseQuickAdd(text, { now, labels, ignored });
const due = (text: string, now = WED) => localStamp(p(text, now).dueDate);

describe("parseQuickAdd (#202)", () => {
  it("parses the full example", () => {
    const text = "Call mom fri 3pm #family !high";
    const r = p(text);
    expect(r.title).toBe("Call mom");
    expect(localStamp(r.dueDate)).toBe("2026-10-9 15:00");
    expect(r.allDay).toBe(false);
    expect(r.labelIds).toEqual(["fam"]);
    expect(r.priority).toBe("high");
    expect(r.tokens.map((t) => [t.kind, t.text])).toEqual([
      ["date", "fri 3pm"],
      ["label", "#family"],
      ["priority", "!high"],
    ]);
    expect(r.tokens.map((t) => text.slice(t.start, t.end))).toEqual([
      "fri 3pm",
      "#family",
      "!high",
    ]);
  });

  it("leaves plain text alone", () => {
    const r = p("Buy milk");
    expect([r.title, r.dueDate, r.allDay, r.labelIds, r.priority, r.tokens]).toEqual([
      "Buy milk",
      null,
      false,
      [],
      null,
      [],
    ]);
    expect(p("").title).toBe("");
    expect(p("   #family  ").title).toBe("");
    expect(p("   #family  ").labelIds).toEqual(["fam"]);
  });

  describe("English dates", () => {
    it.each([
      ["x tomorrow", "2026-10-8 0:00"],
      ["x in 2 days", "2026-10-9 0:00"],
      ["x next week", "2026-10-14 0:00"],
      ["x 05/10", "2027-10-5 0:00"], // day before month; a past date means next year
      ["x 12/10", "2026-10-12 0:00"],
      ["x on 12 Oct", "2026-10-12 0:00"],
      ["x fri at 15:00", "2026-10-9 15:00"],
      ["x today", "2026-10-7 0:00"],
    ])("%s → %s", (text, expected) => {
      expect(due(text)).toBe(expected);
    });

    it("treats a date without time as all day and eats the preposition", () => {
      expect(p("x tomorrow").allDay).toBe(true);
      expect(p("x on 12 Oct").title).toBe("x");
    });

    it("a bare weekday that is today means today; 'next' means next week", () => {
      expect(due("x fri", FRI_EVENING)).toBe("2026-10-9 0:00");
      expect(due("x Freitag", FRI_EVENING)).toBe("2026-10-9 0:00");
      expect(due("x next fri", FRI_EVENING)).toBe("2026-10-16 0:00");
      expect(due("x nächsten Freitag", FRI_EVENING)).toBe("2026-10-16 0:00");
      expect(due("x fri", WED)).toBe("2026-10-9 0:00");
    });

    it("a time that has passed today means tomorrow", () => {
      expect(due("x 3pm", FRI_EVENING)).toBe("2026-10-10 15:00");
      expect(due("x 3pm", WED)).toBe("2026-10-7 15:00");
    });
  });

  describe("German dates", () => {
    it("reads German phrases", () => {
      const r = p("Zahnarzt morgen 9 Uhr");
      expect(r.title).toBe("Zahnarzt");
      expect(localStamp(r.dueDate)).toBe("2026-10-8 9:00");
      expect(due("x übermorgen")).toBe("2026-10-9 0:00");
      expect(due("x Montag 14 Uhr")).toBe("2026-10-12 14:00");
      expect(due("x in 2 Tagen")).toBe("2026-10-9 0:00");
      expect(due("x 12.10.2026")).toBe("2026-10-12 0:00");
    });

    it("reads '12.10.' and keeps prepositions with the date", () => {
      const steuer = p("Steuer am 12.10.");
      expect([steuer.title, localStamp(steuer.dueDate)]).toEqual(["Steuer", "2026-10-12 0:00"]);
      const abgabe = p("Abgabe bis morgen");
      expect([abgabe.title, abgabe.tokens[0].text]).toEqual(["Abgabe", "bis morgen"]);
      expect(p("Report by fri").title).toBe("Report");
    });
  });

  it.each([
    "Do the dishes",
    "So viel zu tun",
    "Mi casa",
    "Guten Morgen sagen",
    "1 hour workout",
    "Pay 12.50 euros",
    "upgrade to v2.10",
    "Read chapter 5",
    "Fix bug 404",
    "Sa einkaufen",
  ])("keeps the false positive %j as plain text", (text) => {
    const r = p(text);
    expect(r.dueDate).toBeNull();
    expect(r.title).toBe(text);
  });

  it("uses only the first date; a range counts as its start", () => {
    const r = p("Call fri then mon");
    expect(r.tokens.filter((t) => t.kind === "date")).toHaveLength(1);
    expect(r.title).toBe("Call then mon");
    const holiday = p("Holiday 12.10. - 16.10.");
    expect([holiday.title, localStamp(holiday.dueDate)]).toEqual(["Holiday", "2026-10-12 0:00"]);
    const meeting = p("fri 14:00-16:00 meeting");
    expect([meeting.title, localStamp(meeting.dueDate)]).toEqual(["meeting", "2026-10-9 14:00"]);
  });

  it("without the recurrence opt-in, 'every monday' stays a plain task", () => {
    const r = p("Gym every monday 7am");
    expect([r.recurrence, r.title, localStamp(r.dueDate)]).toEqual([
      null,
      "Gym every",
      "2026-10-12 7:00",
    ]);
  });

  describe("labels", () => {
    it("matches existing labels ignoring case, spaces, hyphens and underscores", () => {
      expect(p("x #deep-work").labelIds).toEqual(["dw"]);
      expect(p("x #deepwork").labelIds).toEqual(["dw"]);
      expect(p("x #DeepWork").labelIds).toEqual(["dw"]);
      expect(p("x #FAMILY").labelIds).toEqual(["fam"]);
      expect(p("x #family #family").labelIds).toEqual(["fam"]);
    });

    it("stops a tag at punctuation and keeps the punctuation", () => {
      const r = p("x #family, #work.");
      expect([r.labelIds, r.title]).toEqual([["fam", "w"], "x , ."]);
    });

    it("leaves unknown tags and 'C#' in the title", () => {
      expect([p("x #unknown").labelIds, p("x #unknown").title]).toEqual([[], "x #unknown"]);
      expect([p("learn C#").tokens, p("learn C#").title]).toEqual([[], "learn C#"]);
    });

    it("masks tags before date detection", () => {
      expect(p("x #monday-standup").dueDate).toBeNull();
    });
  });

  describe("priority", () => {
    it.each([
      ["x !1", "high"],
      ["x !2", "medium"],
      ["x !3", "low"],
      ["x !med", "medium"],
      ["x !LOW", "low"],
      ["x !high.", "high"],
    ])("%s → %s", (text, expected) => {
      expect(p(text).priority).toBe(expected);
    });

    it("the last one wins and needs a word start", () => {
      const r = p("x !high y !low");
      expect([r.priority, r.title]).toEqual(["low", "x !high y"]);
      expect([p("wow!high").priority, p("wow!high").title]).toEqual([null, "wow!high"]);
      expect(p("x !highest").priority).toBeNull();
    });
  });

  describe("ignoring tokens", () => {
    it("keeps ignored tokens as text", () => {
      const r = p(
        "Call mom fri 3pm #family !high",
        WED,
        new Set(["date:fri 3pm", "label:fam", "priority"]),
      );
      expect([r.title, r.dueDate, r.labelIds, r.priority, r.tokens]).toEqual([
        "Call mom fri 3pm #family !high",
        null,
        [],
        null,
        [],
      ]);
      expect(r.ignoredTokens.map((t) => t.id)).toEqual(["date:fri 3pm", "label:fam", "priority"]);
      expect(r.ignoredTokens[2]).toMatchObject({ kind: "priority", priority: "high" });
    });

    it("an ignored date lets the next one count", () => {
      const r = p("Call fri then mon", WED, new Set(["date:fri"]));
      expect(r.tokens.map((t) => t.id)).toEqual(["date:mon"]);
      expect(r.ignoredTokens.map((t) => t.id)).toEqual(["date:fri"]);
      expect(localStamp(r.dueDate)).toBe("2026-10-12 0:00");
      expect(r.title).toBe("Call fri then");
    });

    it("drops ignore ids that no longer match", () => {
      const r = p("Call mon", WED, new Set(["date:fri", "label:fam", "priority"]));
      expect(r.ignoredTokens).toEqual([]);
      expect(r.tokens[0].id).toBe("date:mon");
    });
  });

  it("reports token values (#203)", () => {
    const r = p("Call fri 3pm #family !high");
    expect(r.tokens).toEqual([
      expect.objectContaining({ kind: "date", allDay: false }),
      expect.objectContaining({ kind: "label", labelId: "fam" }),
      expect.objectContaining({ kind: "priority", priority: "high" }),
    ]);
    expect(r.ignoredTokens).toEqual([]);
  });
});
