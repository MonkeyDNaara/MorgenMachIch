import { describe, expect, it } from "vitest";
import { learnHref, parseLearnSlot } from "@/features/learning/lib/learnSlot";

describe("parseLearnSlot", () => {
  it("reads review", () => {
    expect(parseLearnSlot("review")).toBe("review");
  });

  it("falls back to today for nothing, unknown values and repeated params", () => {
    expect(parseLearnSlot(undefined)).toBe("today");
    expect(parseLearnSlot("")).toBe("today");
    expect(parseLearnSlot("foo")).toBe("today");
    expect(parseLearnSlot(["review", "today"])).toBe("today");
  });
});

describe("learnHref", () => {
  it("links New to /learn and Review to the slot query", () => {
    expect(learnHref("today")).toBe("/learn");
    expect(learnHref("review")).toBe("/learn?slot=review");
  });
});
