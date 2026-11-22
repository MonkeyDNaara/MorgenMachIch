import { describe, expect, it } from "vitest";
import { loadingProgress } from "@/features/learning/lib/loadingProgress";

describe("loadingProgress (#467)", () => {
  it("starts at 0 and only rises", () => {
    expect(loadingProgress(0)).toBe(0);
    expect(loadingProgress(-3)).toBe(0);
    expect(loadingProgress(10)).toBeGreaterThan(loadingProgress(5));
  });

  it("stays below 90 % however long it takes", () => {
    expect(loadingProgress(18)).toBeCloseTo(56.9, 1);
    expect(loadingProgress(600)).toBeLessThan(90);
  });
});
