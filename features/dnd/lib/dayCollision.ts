import { pointerWithin, rectIntersection, type CollisionDetection } from "@dnd-kit/core";

/**
 * Collision detection for day targets (#356, #357): pointer drags hit the
 * day under the pointer; keyboard drags (no pointer coordinates) hit the
 * day the dragged chip was moved onto by `dayKeyboardCoordinates`.
 */
export const dayCollision: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);
