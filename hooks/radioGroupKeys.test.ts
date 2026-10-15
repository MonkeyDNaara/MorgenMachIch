import { describe, expect, it } from "vitest";
import { nextRadioIndex } from "@/hooks/radioGroupKeys";

describe("nextRadioIndex", () => {
  it.each(["ArrowRight", "ArrowDown"])("%s moves to the next option and wraps", (key) => {
    expect(nextRadioIndex(key, 0, 5)).toBe(1);
    expect(nextRadioIndex(key, 3, 5)).toBe(4);
    expect(nextRadioIndex(key, 4, 5)).toBe(0);
  });

  it.each(["ArrowLeft", "ArrowUp"])("%s moves to the previous option and wraps", (key) => {
    expect(nextRadioIndex(key, 4, 5)).toBe(3);
    expect(nextRadioIndex(key, 1, 5)).toBe(0);
    expect(nextRadioIndex(key, 0, 5)).toBe(4);
  });

  it("starts at the first (next) or last (previous) option when nothing is checked", () => {
    expect(nextRadioIndex("ArrowRight", -1, 5)).toBe(0);
    expect(nextRadioIndex("ArrowDown", -1, 5)).toBe(0);
    expect(nextRadioIndex("ArrowLeft", -1, 5)).toBe(4);
    expect(nextRadioIndex("ArrowUp", -1, 5)).toBe(4);
  });

  it("jumps with Home and End", () => {
    expect(nextRadioIndex("Home", 3, 5)).toBe(0);
    expect(nextRadioIndex("End", 1, 5)).toBe(4);
    expect(nextRadioIndex("Home", -1, 5)).toBe(0);
    expect(nextRadioIndex("End", -1, 12)).toBe(11);
  });

  it.each(["Enter", " ", "Tab", "a", "PageDown", "Escape"])("ignores %j", (key) => {
    expect(nextRadioIndex(key, 2, 5)).toBeNull();
  });

  it("handles a single option and an empty group", () => {
    expect(nextRadioIndex("ArrowRight", 0, 1)).toBe(0);
    expect(nextRadioIndex("ArrowLeft", 0, 1)).toBe(0);
    expect(nextRadioIndex("ArrowRight", 0, 0)).toBeNull();
    expect(nextRadioIndex("Home", -1, 0)).toBeNull();
  });
});
