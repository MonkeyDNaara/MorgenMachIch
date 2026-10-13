import { describe, expect, it } from "vitest";
import {
  compareOrderKeys,
  isValidOrderKey,
  keyBetween,
  keysBetween,
  ORDER_KEY_DIGITS,
} from "@/lib/utils/orderKey";

/** Every key valid and the list strictly ascending by plain comparison. */
function expectStrictlyOrdered(keys: string[]) {
  keys.forEach((key) => expect(isValidOrderKey(key)).toBe(true));
  for (let i = 1; i < keys.length; i++) expect(keys[i - 1] < keys[i]).toBe(true);
}

describe("isValidOrderKey", () => {
  it.each(["1", "V", "z", "0V", "a0b", "zzz"])("accepts %s", (key) => {
    expect(isValidOrderKey(key)).toBe(true);
  });

  it.each(["", "0", "V0", "a-b", "ä", " V"])("rejects %j", (key) => {
    expect(isValidOrderKey(key)).toBe(false);
  });
});

describe("ORDER_KEY_DIGITS", () => {
  it("is in ASCII order, so plain string comparison sorts keys", () => {
    const digits = [...ORDER_KEY_DIGITS];
    expect(digits).toHaveLength(62);
    expect([...digits].sort()).toEqual(digits);
  });

  it("differs from locale order — compareOrderKeys must not use localeCompare", () => {
    expect(compareOrderKeys("B", "a")).toBe(-1);
    expect("B".localeCompare("a")).toBe(1);
    expect(compareOrderKeys("V", "V")).toBe(0);
  });
});

describe("keyBetween", () => {
  it("starts a list in the middle of the range", () => {
    expect(keyBetween(null, null)).toBe("V");
  });

  it.each([
    [null, "V"],
    ["V", null],
    ["1", "2"],
    ["V", "W"],
    ["Vz", "W"],
    ["z", null],
    [null, "1"],
    [null, "01"],
    ["0V", "1"],
    ["a1", "a2"],
    ["A", "a"],
    ["Zz", "a"],
  ] as const)("finds a key between %j and %j", (a, b) => {
    const key = keyBetween(a, b);
    expect(isValidOrderKey(key)).toBe(true);
    if (a !== null) expect(a < key).toBe(true);
    if (b !== null) expect(key < b).toBe(true);
  });

  it("throws when the bounds are out of order or equal", () => {
    expect(() => keyBetween("W", "V")).toThrow("out of order");
    expect(() => keyBetween("V", "V")).toThrow("out of order");
  });

  it("throws on invalid keys", () => {
    expect(() => keyBetween("V0", null)).toThrow("Invalid order key");
    expect(() => keyBetween(null, "")).toThrow("Invalid order key");
    expect(() => keyBetween("ä", "z")).toThrow("Invalid order key");
  });

  it("stays ordered for 1,000 inserts at the end", () => {
    const keys: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 1000; i++) keys.push((last = keyBetween(last, null)));
    expectStrictlyOrdered(keys);
  });

  it("stays ordered for 1,000 inserts at the front", () => {
    const keys: string[] = [];
    let first: string | null = null;
    for (let i = 0; i < 1000; i++) keys.unshift((first = keyBetween(null, first)));
    expectStrictlyOrdered(keys);
  });

  it("stays ordered for 1,000 inserts into the same gap", () => {
    // Always right after "a": the gap keeps shrinking from above.
    const keys = ["a", "b"];
    for (let i = 0; i < 1000; i++) keys.splice(1, 0, keyBetween(keys[0], keys[1]));
    expectStrictlyOrdered(keys);
    // …and from below: always right before "b".
    const fromBelow = ["a", "b"];
    for (let i = 0; i < 1000; i++) {
      const n = fromBelow.length;
      fromBelow.splice(n - 1, 0, keyBetween(fromBelow[n - 2], fromBelow[n - 1]));
    }
    expectStrictlyOrdered(fromBelow);
  });

  it("stays ordered for 2,000 random inserts", () => {
    // Deterministic pseudo-random positions (LCG), so a failure is reproducible.
    let seed = 42;
    const random = () => (seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31;
    const keys: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const at = Math.floor(random() * (keys.length + 1));
      keys.splice(at, 0, keyBetween(keys[at - 1] ?? null, keys[at] ?? null));
    }
    expectStrictlyOrdered(keys);
  });
});

describe("keysBetween", () => {
  it("returns nothing for n <= 0", () => {
    expect(keysBetween(null, null, 0)).toEqual([]);
    expect(keysBetween(null, null, -1)).toEqual([]);
  });

  it.each([1, 2, 3, 7, 62, 500])("gives %i ascending keys", (n) => {
    const keys = keysBetween(null, null, n);
    expect(keys).toHaveLength(n);
    expectStrictlyOrdered(keys);
  });

  it("keeps keys short by splitting the gap evenly", () => {
    expect(keysBetween(null, null, 20).every((key) => key.length === 1)).toBe(true);
    expect(Math.max(...keysBetween(null, null, 500).map((key) => key.length))).toBeLessThanOrEqual(
      3,
    );
  });

  it("stays inside the bounds", () => {
    const keys = keysBetween("V", "W", 10);
    expectStrictlyOrdered(["V", ...keys, "W"]);
  });
});
