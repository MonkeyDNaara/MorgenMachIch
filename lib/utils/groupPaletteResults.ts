import { rankByMatcher, type FuzzyMatch, type RankedItem } from "@/lib/utils/fuzzyMatch";

export type PaletteGroup<T> = { group: string; entries: RankedItem<T>[] };

/**
 * Filters and ranks palette items with `match` (usually a fuzzy match of
 * the current query), then buckets them under
 * their `group` heading (#195). Headings follow `groupOrder` (unknown
 * groups come last, in first-seen order) and empty groups are dropped, so
 * "Pages" never leapfrogs "Tasks" just because one score is higher —
 * ranking only applies *within* a group, which keeps the list stable as
 * the user types. `maxPerGroup` keeps the best few per group (#197), so a
 * long task list can't push the commands off screen or slow rendering.
 */
export function groupPaletteResults<T extends { group: string }>(
  items: readonly T[],
  match: (item: T) => FuzzyMatch | null,
  groupOrder: readonly string[],
  maxPerGroup = Infinity,
): PaletteGroup<T>[] {
  const byGroup = new Map<string, RankedItem<T>[]>();
  for (const ranked of rankByMatcher(items, match)) {
    const bucket = byGroup.get(ranked.item.group);
    if (bucket) bucket.push(ranked);
    else byGroup.set(ranked.item.group, [ranked]);
  }

  const known = groupOrder.filter((group) => byGroup.has(group));
  const extra = [...byGroup.keys()].filter((group) => !groupOrder.includes(group));
  return [...known, ...extra].map((group) => ({
    group,
    entries: byGroup.get(group)!.slice(0, maxPerGroup),
  }));
}
