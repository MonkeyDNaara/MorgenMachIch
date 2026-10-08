import { rankByQuery, type RankedItem } from "@/lib/utils/fuzzyMatch";

export type PaletteGroup<T> = { group: string; entries: RankedItem<T>[] };

/**
 * Filters and ranks palette items for `query`, then buckets them under
 * their `group` heading (#195). Headings follow `groupOrder` (unknown
 * groups come last, in first-seen order) and empty groups are dropped, so
 * "Pages" never leapfrogs "Tasks" just because one score is higher —
 * ranking only applies *within* a group, which keeps the list stable as
 * the user types.
 */
export function groupPaletteResults<T extends { group: string }>(
  items: readonly T[],
  query: string,
  getText: (item: T) => string,
  groupOrder: readonly string[],
): PaletteGroup<T>[] {
  const byGroup = new Map<string, RankedItem<T>[]>();
  for (const ranked of rankByQuery(items, query, getText)) {
    const bucket = byGroup.get(ranked.item.group);
    if (bucket) bucket.push(ranked);
    else byGroup.set(ranked.item.group, [ranked]);
  }

  const known = groupOrder.filter((group) => byGroup.has(group));
  const extra = [...byGroup.keys()].filter((group) => !groupOrder.includes(group));
  return [...known, ...extra].map((group) => ({ group, entries: byGroup.get(group)! }));
}
