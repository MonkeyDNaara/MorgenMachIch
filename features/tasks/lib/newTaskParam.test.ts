import { describe, expect, it } from "vitest";
import { takeNewTaskParam } from "./newTaskParam";

describe("takeNewTaskParam", () => {
  it("opens and removes the flag", () => {
    expect(takeNewTaskParam("?new=1")).toEqual({ open: true, search: "" });
  });

  it("keeps other parameters", () => {
    expect(takeNewTaskParam("?a=b&new=1&c=d")).toEqual({
      open: true,
      search: "?a=b&c=d",
    });
  });

  it("ignores a missing or different value", () => {
    expect(takeNewTaskParam("")).toEqual({ open: false, search: "" });
    expect(takeNewTaskParam("?new=0")).toEqual({
      open: false,
      search: "?new=0",
    });
    expect(takeNewTaskParam("?x=1")).toEqual({ open: false, search: "?x=1" });
  });
});
