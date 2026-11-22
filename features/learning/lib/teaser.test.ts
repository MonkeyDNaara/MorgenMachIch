import { describe, expect, it } from "vitest";
import { teaserOf } from "@/features/learning/lib/teaser";

describe("teaserOf (#468)", () => {
  it("takes the first paragraph without Markdown marks", () => {
    expect(teaserOf("A **closure** keeps `scope`, see [docs](https://x.y).\n\nSecond.")).toBe(
      "A closure keeps scope, see docs.",
    );
  });

  it("skips headings, lists and code blocks before the first paragraph", () => {
    expect(teaserOf("# Title\n\n- a\n- b\n\nThe real text.")).toBe("The real text.");
  });

  it("shortens long text at a word and adds an ellipsis", () => {
    const text = "word ".repeat(100);
    const teaser = teaserOf(text);
    expect(teaser.length).toBeLessThanOrEqual(221);
    expect(teaser.endsWith("…")).toBe(true);
  });

  it("is empty without a paragraph", () => {
    expect(teaserOf("")).toBe("");
    expect(teaserOf("- only\n- a list")).toBe("");
  });
});
