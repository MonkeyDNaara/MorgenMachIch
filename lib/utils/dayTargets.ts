/**
 * Keyboard dragging onto day targets (#356): arrow keys jump from one day
 * to the next instead of nudging the dragged item by a few pixels. Pure —
 * the dnd-kit coordinate getter (`lib/ui/dnd/dayKeyboardCoordinates.ts`)
 * feeds it the measured target rects.
 */

export type TargetRect = { id: string; left: number; top: number; width: number; height: number };
export type Point = { x: number; y: number };

const center = (rect: TargetRect): Point => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const contains = (rect: TargetRect, point: Point) =>
  point.x >= rect.left &&
  point.x <= rect.left + rect.width &&
  point.y >= rect.top &&
  point.y <= rect.top + rect.height;

/**
 * Center of the target to move to: targets in reading order (top, then
 * left); from the target the point is in, `next` goes one forward and
 * `prev` one back (staying put at the ends). From outside every target
 * (the start, over the task list), `next` goes to the first target and
 * `prev` to the last. Null when there are no targets.
 */
export function nextDayTarget(
  targets: TargetRect[],
  current: Point,
  direction: "next" | "prev",
): Point | null {
  if (targets.length === 0) return null;
  const ordered = [...targets].sort((a, b) => a.top - b.top || a.left - b.left);
  const index = ordered.findIndex((rect) => contains(rect, current));
  if (index === -1) return center(direction === "next" ? ordered[0] : ordered[ordered.length - 1]);
  const target =
    direction === "next" ? Math.min(index + 1, ordered.length - 1) : Math.max(index - 1, 0);
  return center(ordered[target]);
}
