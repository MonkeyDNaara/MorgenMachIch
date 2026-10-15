// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStoredFlag } from "@/lib/storage/storedFlag";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("createStoredFlag (#357)", () => {
  it("returns the fallback until something is stored", () => {
    expect(createStoredFlag("t:a", true).read()).toBe(true);
    expect(createStoredFlag("t:b", false).read()).toBe(false);
  });

  it("stores 1/0 and reads them back", () => {
    const flag = createStoredFlag("t:c", false);
    flag.write(true);
    expect(window.localStorage.getItem("t:c")).toBe("1");
    expect(flag.read()).toBe(true);
    flag.write(false);
    expect(flag.read()).toBe(false);
  });

  it("keeps reading the old backlogVisible values ('0' hides, anything else shows)", () => {
    window.localStorage.setItem("t:d", "0");
    expect(createStoredFlag("t:d", true).read()).toBe(false);
  });

  it("notifies subscribers in this tab and stops after unsubscribe", () => {
    const flag = createStoredFlag("t:e", false);
    const onChange = vi.fn();
    const unsubscribe = flag.subscribe(onChange);
    flag.write(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    flag.write(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("falls back when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const flag = createStoredFlag("t:f", true);
    expect(flag.read()).toBe(true);
    expect(() => flag.write(false)).not.toThrow();
  });
});
