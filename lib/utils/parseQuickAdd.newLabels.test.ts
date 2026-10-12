import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "@/lib/utils/parseQuickAdd";
import { LABEL_COLOR_HEXES as H } from "@/lib/constants/labelColors";
import { localDate, makeLabel } from "@/lib/test/factories";

const labels = [
  makeLabel({ id: "w", name: "Work", color: H[0] }),
  makeLabel({ id: "h", name: "Health", color: H[2] }),
];
const WED = localDate(2026, 10, 7, 10);
const p = (text: string, opts: { ignored?: ReadonlySet<string>; recurrence?: boolean } = {}) =>
  parseQuickAdd(text, { now: WED, labels, newLabels: true, ...opts });
const newLabelTokens = (r: ReturnType<typeof p>) => r.tokens.filter((t) => t.kind === "newLabel");

describe("parseQuickAdd with new labels (#283)", () => {
  it("turns an unknown tag into a new label", () => {
    const r = p("Call grandma sun #family !high");
    expect(r.title).toBe("Call grandma");
    expect(r.newLabels).toEqual(["Family"]);
    expect(r.labelIds).toEqual([]);
    expect(newLabelTokens(r).map((t) => [t.id, t.text, t.name, t.index])).toEqual([
      ["newLabel:family", "#family", "Family", 0],
    ]);
  });

  it("mixes known and new labels and dedupes the same new name", () => {
    const r = p("x #work #family #deep-work #Family");
    expect([r.labelIds, r.newLabels, r.title]).toEqual([["w"], ["Family", "Deep work"], "x"]);
    expect(newLabelTokens(r).map((t) => t.index)).toEqual([0, 1, 0]);
  });

  it("leaves numbers and C# alone", () => {
    expect([p("Fix issue #42").title, p("Fix issue #42").newLabels]).toEqual(["Fix issue #42", []]);
    expect(p("learn C#").newLabels).toEqual([]);
  });

  it("is off by default", () => {
    const r = parseQuickAdd("Call #family", { now: WED, labels });
    expect([r.newLabels, r.title]).toEqual([[], "Call #family"]);
  });

  it("an ignored new label stays text, and a typo keeps its color slot", () => {
    const ignored = p("Call #family", { ignored: new Set(["newLabel:family"]) });
    expect([ignored.title, ignored.newLabels, ignored.ignoredTokens.map((t) => t.id)]).toEqual([
      "Call #family",
      [],
      ["newLabel:family"],
    ]);
    const typo = p("Call #famliy #family", { ignored: new Set(["newLabel:famliy"]) });
    expect([typo.newLabels, newLabelTokens(typo).map((t) => t.index)]).toEqual([["Family"], [1]]);
  });

  it("is never a date and works next to a recurrence", () => {
    expect(p("x #monday-standup").dueDate).toBeNull();
    const r = p("Gym every mon #fitness", { recurrence: true });
    expect([r.title, r.newLabels, r.recurrence?.daysOfWeek]).toEqual(["Gym", ["Fitness"], [1]]);
  });
});
