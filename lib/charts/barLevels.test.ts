import { describe, expect, it } from "vitest";
import { barLevels } from "./barLevels";

describe("barLevels (#422)", () => {
  it("tells future, empty and value slots apart", () => {
    expect(barLevels([4, 0, 2, null])).toEqual([
      { kind: "value", ratio: 1 },
      { kind: "empty" },
      { kind: "value", ratio: 0.5 },
      { kind: "future" },
    ]);
  });

  it("uses a fixed max and caps above it", () => {
    expect(barLevels([5, 20], 10)).toEqual([
      { kind: "value", ratio: 0.5 },
      { kind: "value", ratio: 1 },
    ]);
  });

  it("is all empty or future when nothing is above zero", () => {
    expect(barLevels([0, null, -1])).toEqual([
      { kind: "empty" },
      { kind: "future" },
      { kind: "empty" },
    ]);
    expect(barLevels([])).toEqual([]);
  });
});
