import { describe, expect, it } from "vitest";
import { takeUrlFlag } from "./urlFlag";

describe("takeUrlFlag", () => {
  it("finds the flag and removes it, keeping other parameters", () => {
    expect(takeUrlFlag("?sample=1", "sample")).toEqual({ set: true, search: "" });
    expect(takeUrlFlag("?a=b&sample=1", "sample")).toEqual({ set: true, search: "?a=b" });
  });

  it("ignores other values and other flags", () => {
    expect(takeUrlFlag("?sample=0", "sample")).toEqual({ set: false, search: "?sample=0" });
    expect(takeUrlFlag("?new=1", "sample")).toEqual({ set: false, search: "?new=1" });
  });
});
