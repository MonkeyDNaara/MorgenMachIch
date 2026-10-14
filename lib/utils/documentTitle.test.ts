import { describe, expect, it } from "vitest";
import { documentTitle } from "@/lib/utils/documentTitle";

describe("documentTitle (#187)", () => {
  it("puts the count in front", () => {
    expect(documentTitle("Today · MorgenMachIch", 3)).toBe("(3) Today · MorgenMachIch");
    expect(documentTitle("Calendar · MorgenMachIch", 12)).toBe("(12) Calendar · MorgenMachIch");
  });

  it("shows the plain title for 0 or no count", () => {
    expect(documentTitle("Today · MorgenMachIch", 0)).toBe("Today · MorgenMachIch");
    expect(documentTitle("Today · MorgenMachIch", undefined)).toBe("Today · MorgenMachIch");
  });

  it("replaces an existing count instead of stacking it", () => {
    expect(documentTitle("(3) Today · MorgenMachIch", 2)).toBe("(2) Today · MorgenMachIch");
    expect(documentTitle("(3) Today · MorgenMachIch", 0)).toBe("Today · MorgenMachIch");
  });

  it("leaves brackets that aren't a count alone", () => {
    expect(documentTitle("(Draft) Notes", 1)).toBe("(1) (Draft) Notes");
  });
});
