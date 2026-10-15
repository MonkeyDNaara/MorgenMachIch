import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";

/** A mouse drag starts after this many pixels, so a click on the handle
 * stays a click (#73 opens the move menu with it). */
export const MOUSE_DRAG_DISTANCE = 6;
/** A touch drag starts after holding this long without moving more than
 * the tolerance, so swiping still scrolls the page. */
export const TOUCH_DRAG_DELAY = 250;
export const TOUCH_DRAG_TOLERANCE = 5;

type Options = {
  /** Where arrow keys move the item, e.g. `sortableKeyboardCoordinates`. */
  coordinateGetter?: KeyboardCoordinateGetter;
  /** False turns mouse and touch dragging off (the calendar below `md`);
   * keyboard dragging stays. */
  pointer?: boolean;
};

/**
 * The one sensor setup every drag & drop surface uses (#355): mouse and
 * touch sensors instead of the generic pointer sensor, because they need
 * different activation rules (distance vs. long press). Space/Enter pick
 * up, arrows move, Space/Enter drop, Escape cancels.
 */
export function useAppSensors({ coordinateGetter, pointer = true }: Options = {}) {
  const mouse = useSensor(MouseSensor, { activationConstraint: { distance: MOUSE_DRAG_DISTANCE } });
  const touch = useSensor(TouchSensor, {
    activationConstraint: { delay: TOUCH_DRAG_DELAY, tolerance: TOUCH_DRAG_TOLERANCE },
  });
  const keyboard = useSensor(KeyboardSensor, coordinateGetter ? { coordinateGetter } : {});
  return useSensors(pointer ? mouse : null, pointer ? touch : null, keyboard);
}
