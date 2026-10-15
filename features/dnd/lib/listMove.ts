/**
 * Pure helpers for moving one item inside an ordered list of ids (#73):
 * shared by drag & drop and the grip's move menu, so both produce the
 * same order. The new order is what's shown; the item's neighbours in it
 * are what `reorderBacklogTask` needs to compute the new key.
 */

export type MoveAction = "top" | "up" | "down" | "bottom";

export const MOVE_ACTIONS: { action: MoveAction; label: string }[] = [
  { action: "top", label: "Move to top" },
  { action: "up", label: "Move up" },
  { action: "down", label: "Move down" },
  { action: "bottom", label: "Move to bottom" },
];

/** `ids` with `id` moved to `toIndex` (clamped); unchanged copy if `id` is missing. */
export function moveId(ids: string[], id: string, toIndex: number): string[] {
  const from = ids.indexOf(id);
  if (from === -1) return [...ids];
  const rest = ids.filter((other) => other !== id);
  const to = Math.max(0, Math.min(toIndex, rest.length));
  return [...rest.slice(0, to), id, ...rest.slice(to)];
}

/** Where a menu action puts `id`, or null when it can't move that way
 * (already at the top/bottom, or not in the list). */
export function moveTargetIndex(ids: string[], id: string, action: MoveAction): number | null {
  const index = ids.indexOf(id);
  if (index === -1) return null;
  const last = ids.length - 1;
  const target = { top: 0, up: index - 1, down: index + 1, bottom: last }[action];
  return target < 0 || target > last || target === index ? null : target;
}

/** The ids directly above and below `id` (null at the ends). */
export function neighboursOf(
  ids: string[],
  id: string,
): { prevId: string | null; nextId: string | null } {
  const index = ids.indexOf(id);
  if (index === -1) throw new Error(`Not in the list: ${id}`);
  return { prevId: ids[index - 1] ?? null, nextId: ids[index + 1] ?? null };
}

/** True when both lists hold the same ids in the same order. */
export function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * `items` in the order of `order` — used to keep a dropped order on screen
 * until the live query reflects it. Items missing from `order` (e.g. one
 * added meanwhile) keep their relative place at the end; ids in `order`
 * without an item are skipped.
 */
export function applyOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  const known = items.filter((item) => rank.has(item.id));
  const unknown = items.filter((item) => !rank.has(item.id));
  known.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  return [...known, ...unknown];
}
