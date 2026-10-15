import { describe, expect, it } from "vitest";
import { getQuickAddSuggestions, labelTag } from "@/features/quick-add/lib/quickAddSuggestions";
import { LABEL_COLOR_HEXES as H } from "@/lib/constants/labelColors";
import { makeLabel } from "@/lib/test/factories";

const labels = [
  makeLabel({ id: "fam", name: "Family", color: H[0] }),
  makeLabel({ id: "dw", name: "Deep work", color: H[1] }),
  makeLabel({ id: "q", name: "Q4/Plans", color: H[2] }),
];
const s = (text: string) => getQuickAddSuggestions(text, labels);
const inserts = (text: string) => s(text)?.items.map((i) => i.insert) ?? null;

describe("getQuickAddSuggestions (#203, #283)", () => {
  it("builds tags from label names", () => {
    expect(labelTag({ name: " Deep  work " })).toBe("deep-work");
  });

  it("suggests labels after # (skipping names that can't be a tag) with fuzzy matching", () => {
    expect(inserts("Call #")).toEqual(["#family", "#deep-work"]);
    expect(inserts("Call #dw")).toEqual(["#deep-work"]);
    expect(s("Call #fa")).toMatchObject({ start: 5, kind: "label" });
  });

  it("closes once a tag is complete, after the caret moved on, or mid-word", () => {
    expect(s("Call #family")).toBeNull();
    expect(s("x #fam then")).toBeNull();
    expect(s("C#")).toBeNull();
  });

  it("offers a new label for an unknown tag instead of items", () => {
    const result = s("Call #xyz");
    expect(result?.items).toEqual([]);
    expect(result?.newLabel?.name).toBe("Xyz");
  });

  it("gives the new-label hint the color its chip will get", () => {
    const colored = [
      makeLabel({ id: "w", name: "Work", color: H[0] }),
      makeLabel({ id: "h", name: "Health", color: H[2] }),
    ];
    const hint = (text: string) => getQuickAddSuggestions(text, colored)?.newLabel;
    expect(hint("Call #fam")).toEqual({ name: "Fam", color: H[1] });
    expect(hint("Call #family #sp")).toEqual({ name: "Sp", color: H[3] });
    expect(hint("x #family #family")).toEqual({ name: "Family", color: H[1] });
  });

  it("suggests priorities after !", () => {
    expect(inserts("x !")).toEqual(["!high", "!medium", "!low"]);
    expect(s("x !")?.items.map((i) => i.hint)).toEqual(["!1", "!2", "!3"]);
    expect(inserts("x !m")).toEqual(["!medium"]);
    expect(inserts("x !hi")).toEqual(["!high"]);
    expect(s("x !")?.items[0].color).toBe("var(--color-error)");
    expect(s("x !")?.kind).toBe("priority");
    expect(s("x !")?.newLabel).toBeNull();
  });

  it.each(["x !2", "x !high", "x !med", "x !low", "x !z", "wow!"])(
    "has no suggestions for %j",
    (text) => {
      expect(inserts(text)).toBeNull();
    },
  );
});
