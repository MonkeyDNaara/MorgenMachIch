import { describe, expect, it } from "vitest";
import { chartRange, lineSegments, scalePoints, scaleY, segmentPath } from "./scalePoints";

describe("chartRange (#422)", () => {
  it("is null without data, unless both ends are given", () => {
    expect(chartRange([])).toBeNull();
    expect(chartRange([null, null])).toBeNull();
    expect(chartRange([null], { min: 0, max: 10 })).toEqual({ min: 0, max: 10 });
  });

  it("uses the data's min and max, with overrides", () => {
    expect(chartRange([3, null, 7, 5])).toEqual({ min: 3, max: 7 });
    expect(chartRange([3, 7], { min: 0 })).toEqual({ min: 0, max: 7 });
    expect(chartRange([3, 7], { max: 10 })).toEqual({ min: 3, max: 10 });
  });
});

describe("scaleY", () => {
  it("puts max at the top and min at the bottom", () => {
    const range = { min: 0, max: 10 };
    expect(scaleY(10, range, 100)).toBe(0);
    expect(scaleY(0, range, 100)).toBe(100);
    expect(scaleY(5, range, 100)).toBe(50);
  });

  it("draws a flat range in the middle and clamps outliers", () => {
    expect(scaleY(4, { min: 4, max: 4 }, 100)).toBe(50);
    expect(scaleY(20, { min: 0, max: 10 }, 100)).toBe(0);
    expect(scaleY(-5, { min: 0, max: 10 }, 100)).toBe(100);
  });

  it("handles a negative range", () => {
    expect(scaleY(-10, { min: -10, max: 10 }, 100)).toBe(100);
    expect(scaleY(0, { min: -10, max: 10 }, 100)).toBe(50);
  });
});

describe("scalePoints", () => {
  it("returns nothing for no values", () => {
    expect(scalePoints([], 100, 50)).toEqual([]);
  });

  it("puts a single value in the middle", () => {
    expect(scalePoints([7], 100, 50)).toEqual([{ x: 50, y: 25 }]);
  });

  it("spreads values across the width and keeps nulls in place", () => {
    expect(scalePoints([0, null, 10], 100, 50)).toEqual([{ x: 0, y: 50 }, null, { x: 100, y: 0 }]);
  });

  it("draws a flat series in the middle", () => {
    expect(scalePoints([2, 2, 2], 100, 50).map((point) => point?.y)).toEqual([25, 25, 25]);
  });

  it("respects min/max overrides", () => {
    expect(scalePoints([5], 100, 100, { min: 0, max: 10 })).toEqual([{ x: 50, y: 50 }]);
  });

  it("is all null when there is no data at all", () => {
    expect(scalePoints([null, null], 100, 50)).toEqual([null, null]);
  });
});

describe("lineSegments + segmentPath", () => {
  it("breaks the line at nulls", () => {
    const points = scalePoints([1, 2, null, 3, null, null, 4], 60, 30);
    const segments = lineSegments(points);
    expect(segments.map((segment) => segment.length)).toEqual([2, 1, 1]);
  });

  it("builds path data; a lone point is a zero-length line", () => {
    expect(
      segmentPath([
        { x: 0, y: 10 },
        { x: 50.555, y: 0 },
      ]),
    ).toBe("M0 10L50.56 0");
    expect(segmentPath([{ x: 5, y: 5 }])).toBe("M5 5h0");
    expect(segmentPath([])).toBe("");
  });
});
