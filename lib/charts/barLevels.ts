/**
 * One bar per slot for MiniBars (#422): a future slot (`null`), an empty
 * one (0 or less) or a value with its height as a share of the largest.
 */
export type BarLevel = { kind: "future" } | { kind: "empty" } | { kind: "value"; ratio: number };

export function barLevels(values: readonly (number | null)[], max?: number): BarLevel[] {
  const top = max ?? Math.max(0, ...values.filter((value): value is number => value !== null));
  return values.map((value) => {
    if (value === null) return { kind: "future" };
    if (value <= 0 || top <= 0) return { kind: "empty" };
    return { kind: "value", ratio: Math.min(1, value / top) };
  });
}
