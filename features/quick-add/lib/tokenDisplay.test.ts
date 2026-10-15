import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "@/features/quick-add/lib/parseQuickAdd";
import { tokenColor, tokenLabel } from "@/features/quick-add/lib/tokenDisplay";
import { LABEL_COLOR_HEXES as H } from "@/lib/constants/labelColors";
import { localDate, makeLabel } from "@/lib/test/factories";

const WED = localDate(2026, 10, 7, 10);

describe("tokenLabel — quick-add chips (#275, #283)", () => {
  const labels = [makeLabel({ id: "h", name: "Health" })];
  const chips = (text: string) =>
    parseQuickAdd(text, { now: WED, labels, recurrence: true }).tokens.map((t) =>
      tokenLabel(t, labels, WED),
    );

  it.each([
    [
      "Gym jeden Mo und Do 18 Uhr bis 31.12. #health !high",
      ["Every week on Mon, Thu", "at 18:00", "until Thu 31 Dec", "Health", "High"],
    ],
    ["Rent every 1st from 1.12.", ["Every month on the 1st", "from Tue 1 Dec"]],
    ["x every mon from 19 Oct 9am", ["Every week on Mon", "from Mon 19 Oct, 09:00"]],
    ["x every day from tomorrow", ["Every day", "from tomorrow"]],
    ["Call fri 3pm", ["Fri 9 Oct, 15:00"]],
  ])("%j", (text, expected) => {
    expect(chips(text)).toEqual(expected);
  });

  it("marks due dates and time-only tokens", () => {
    const tokens = (text: string) => parseQuickAdd(text, { now: WED, labels });
    expect(
      tokens("Call 3pm").tokens.map((t) => ("role" in t ? [t.role, t.timeOnly] : null)),
    ).toEqual([["due", true]]);
    expect(
      tokens("Call fri").tokens.map((t) => ("role" in t ? [t.role, t.timeOnly] : null)),
    ).toEqual([["due", false]]);
  });
});

describe("new-label chips", () => {
  it("reads 'New label: …' in the first unused palette color", () => {
    const labels = [
      makeLabel({ id: "w", name: "Work", color: H[0] }),
      makeLabel({ id: "h", name: "Health", color: H[2] }),
    ];
    const token = parseQuickAdd("Call #family", { now: WED, labels, newLabels: true }).tokens.find(
      (t) => t.kind === "newLabel",
    )!;
    expect(tokenLabel(token, labels, WED)).toBe("New label: Family");
    expect(tokenColor(token, labels)).toBe(H[1]);
  });
});
