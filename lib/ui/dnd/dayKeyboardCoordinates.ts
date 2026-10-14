import type { KeyboardCoordinateGetter } from "@dnd-kit/core";
import { nextDayTarget, type TargetRect } from "@/lib/utils/dayTargets";

const DIRECTION: Record<string, "next" | "prev"> = {
  ArrowRight: "next",
  ArrowDown: "next",
  ArrowLeft: "prev",
  ArrowUp: "prev",
};

/**
 * Keyboard sensor coordinates for day targets (#356): each arrow key moves
 * the dragged item onto the center of the next or previous enabled day
 * (see `nextDayTarget`). dnd-kit's coordinates are the dragged rect's
 * top-left corner, hence the half-size offsets.
 */
export const dayKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const direction = DIRECTION[event.code];
  const { collisionRect, droppableRects, droppableContainers } = context;
  if (!direction || !collisionRect) return undefined;
  event.preventDefault();

  const targets: TargetRect[] = [];
  for (const container of droppableContainers.getEnabled()) {
    const rect = droppableRects.get(container.id);
    if (rect) targets.push({ id: String(container.id), ...rect });
  }
  const current = {
    x: collisionRect.left + collisionRect.width / 2,
    y: collisionRect.top + collisionRect.height / 2,
  };
  const target = nextDayTarget(targets, current, direction);
  return target
    ? { x: target.x - collisionRect.width / 2, y: target.y - collisionRect.height / 2 }
    : undefined;
};
