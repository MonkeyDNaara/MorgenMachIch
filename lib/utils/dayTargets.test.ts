import { describe, expect, it } from "vitest";
import { nextDayTarget, type TargetRect } from "@/lib/utils/dayTargets";

/** Three day cards in a row, 100 px wide with a 10 px gap, top 500. */
const DAYS: TargetRect[] = [
  { id: "day:2026-10-16", left: 220, top: 500, width: 100, height: 80 },
  { id: "day:2026-10-14", left: 0, top: 500, width: 100, height: 80 },
  { id: "day:2026-10-15", left: 110, top: 500, width: 100, height: 80 },
];
const centerOf = (left: number) => ({ x: left + 50, y: 540 });

describe("nextDayTarget (#356)", () => {
  it("starts at the first or last day from outside the targets", () => {
    expect(nextDayTarget(DAYS, { x: 300, y: 100 }, "next")).toEqual(centerOf(0));
    expect(nextDayTarget(DAYS, { x: 300, y: 100 }, "prev")).toEqual(centerOf(220));
  });

  it("steps through the days in reading order", () => {
    expect(nextDayTarget(DAYS, centerOf(0), "next")).toEqual(centerOf(110));
    expect(nextDayTarget(DAYS, centerOf(110), "next")).toEqual(centerOf(220));
    expect(nextDayTarget(DAYS, centerOf(220), "prev")).toEqual(centerOf(110));
  });

  it("stays on the first and last day at the ends", () => {
    expect(nextDayTarget(DAYS, centerOf(220), "next")).toEqual(centerOf(220));
    expect(nextDayTarget(DAYS, centerOf(0), "prev")).toEqual(centerOf(0));
  });

  it("orders rows top to bottom, then left to right", () => {
    const grid: TargetRect[] = [
      { id: "b", left: 0, top: 100, width: 50, height: 50 },
      { id: "a2", left: 60, top: 0, width: 50, height: 50 },
      { id: "a1", left: 0, top: 0, width: 50, height: 50 },
    ];
    expect(nextDayTarget(grid, { x: 85, y: 25 }, "next")).toEqual({ x: 25, y: 125 });
  });

  it("returns null without targets", () => {
    expect(nextDayTarget([], { x: 0, y: 0 }, "next")).toBeNull();
  });
});
