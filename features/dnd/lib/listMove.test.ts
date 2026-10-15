import { describe, expect, it } from "vitest";
import {
  applyOrder,
  moveId,
  moveTargetIndex,
  neighboursOf,
  sameOrder,
  type MoveAction,
} from "@/features/dnd/lib/listMove";

const IDS = ["a", "b", "c", "d"];

describe("moveId", () => {
  it.each([
    ["c", 0, "cabd"],
    ["a", 3, "bcda"],
    ["b", 2, "acbd"],
    ["b", 1, "abcd"],
    ["d", 99, "abcd"],
    ["c", -5, "cabd"],
  ])("moves %s to index %i", (id, to, expected) => {
    expect(moveId(IDS, id, to).join("")).toBe(expected);
  });

  it("returns an unchanged copy for an unknown id", () => {
    const result = moveId(IDS, "x", 0);
    expect(result).toEqual(IDS);
    expect(result).not.toBe(IDS);
  });
});

describe("moveTargetIndex", () => {
  it.each<[string, MoveAction, number | null]>([
    ["c", "top", 0],
    ["c", "up", 1],
    ["c", "down", 3],
    ["c", "bottom", 3],
    ["a", "top", null],
    ["a", "up", null],
    ["d", "down", null],
    ["d", "bottom", null],
    ["b", "top", 0],
    ["x", "up", null],
  ])("%s · %s → %s", (id, action, expected) => {
    expect(moveTargetIndex(IDS, id, action)).toBe(expected);
  });

  it("can't move the only item", () => {
    for (const action of ["top", "up", "down", "bottom"] as const) {
      expect(moveTargetIndex(["a"], "a", action)).toBeNull();
    }
  });

  it("menu actions and moveId agree with drag results", () => {
    const up = moveTargetIndex(IDS, "c", "up")!;
    expect(moveId(IDS, "c", up).join("")).toBe("acbd");
    const bottom = moveTargetIndex(IDS, "a", "bottom")!;
    expect(moveId(IDS, "a", bottom).join("")).toBe("bcda");
  });
});

describe("neighboursOf", () => {
  it("returns the ids around an item, null at the ends", () => {
    expect(neighboursOf(IDS, "a")).toEqual({ prevId: null, nextId: "b" });
    expect(neighboursOf(IDS, "c")).toEqual({ prevId: "b", nextId: "d" });
    expect(neighboursOf(IDS, "d")).toEqual({ prevId: "c", nextId: null });
    expect(neighboursOf(["a"], "a")).toEqual({ prevId: null, nextId: null });
  });

  it("throws for an unknown id", () => {
    expect(() => neighboursOf(IDS, "x")).toThrow("Not in the list");
  });
});

describe("sameOrder", () => {
  it("compares ids and positions", () => {
    expect(sameOrder(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameOrder(["a", "b"], ["b", "a"])).toBe(false);
    expect(sameOrder(["a"], ["a", "b"])).toBe(false);
    expect(sameOrder([], [])).toBe(true);
  });
});

describe("applyOrder", () => {
  const items = ["a", "b", "c", "d"].map((id) => ({ id }));
  const ids = (list: { id: string }[]) => list.map((item) => item.id).join("");

  it("sorts items by the given order", () => {
    expect(ids(applyOrder(items, ["d", "a", "c", "b"]))).toBe("dacb");
  });

  it("keeps items missing from the order at the end and skips unknown ids", () => {
    expect(ids(applyOrder(items, ["c", "x", "a"]))).toBe("cabd");
  });

  it("does not change the input", () => {
    applyOrder(items, ["d", "c", "b", "a"]);
    expect(ids(items)).toBe("abcd");
  });
});
