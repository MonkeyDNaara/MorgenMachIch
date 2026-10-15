import { describe, expect, it } from "vitest";
import {
  canBeLabelTag,
  normalizeLabelName,
  pickLabelColors,
  tagToLabelName,
} from "@/lib/domain/labelNames";
import { LABEL_COLOR_HEXES as H } from "@/lib/constants/labelColors";

describe("tagToLabelName (#283)", () => {
  it.each([
    ["family", "Family"],
    ["deep-work", "Deep work"],
    ["side__project", "Side project"],
    ["DIY", "DIY"],
    ["übung", "Übung"],
  ])("#%s → %s", (tag, name) => {
    expect(tagToLabelName(tag)).toBe(name);
  });

  it("produces a name the same tag matches again", () => {
    expect(normalizeLabelName(tagToLabelName("deep-work"))).toBe(normalizeLabelName("deep-work"));
  });
});

describe("canBeLabelTag", () => {
  it("needs a letter", () => {
    expect([
      canBeLabelTag("42"),
      canBeLabelTag("2026"),
      canBeLabelTag("q4"),
      canBeLabelTag("_-"),
    ]).toEqual([false, false, true, false]);
  });
});

describe("pickLabelColors", () => {
  it("takes unused palette colors first", () => {
    expect(pickLabelColors([H[0], H[2]], 3)).toEqual([H[1], H[3], H[4]]);
    expect(pickLabelColors([], 2)).toEqual([H[0], H[1]]);
  });

  it("rotates through the palette once every color is used", () => {
    expect(pickLabelColors([...H], 2)).toEqual([H[0], H[1]]);
    expect(pickLabelColors(H.slice(0, 11), 2)).toEqual([H[11], H[0]]);
  });
});
