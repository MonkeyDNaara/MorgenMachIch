"use client";

import type { ButtonHTMLAttributes, MouseEvent, Ref } from "react";
import { GripVertical } from "lucide-react";

type DragHandleProps = {
  /** Task title, for the label "Move “…”". */
  title: string;
  /** `setActivatorNodeRef` from `useSortable` / `useDraggable`. */
  handleRef?: Ref<HTMLButtonElement>;
  /** `attributes` + `listeners` from `useSortable` / `useDraggable`. */
  dragProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  /** A click without dragging (the move menu in #73). `event.detail` is 0
   * for clicks fired by the keyboard. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Set when the grip also opens a menu (#73): adds `aria-haspopup` and
   * `aria-expanded`. */
  menuExpanded?: boolean;
  /** Keep the grip visible, e.g. while its menu is open or it is lifted. */
  active?: boolean;
  className?: string;
};

/**
 * The grip that starts a drag (#355). Only the handle drags, so the rest
 * of a card keeps its own clicks (title → drawer) and touch scrolling.
 *
 * - `touch-action: none` only here, so a long press on the grip drags
 *   while a swipe anywhere else scrolls.
 * - With a fine pointer (mouse) it is hidden until the card (a `group`)
 *   is hovered or focused; on touch it is always visible.
 * - dnd-kit's keyboard sensor listens here: Space/Enter pick up.
 * - A click without movement stays a click (mouse sensor needs 6 px).
 */
export default function DragHandle({
  title,
  handleRef,
  dragProps,
  onClick,
  menuExpanded,
  active = false,
  className = "",
}: DragHandleProps) {
  return (
    <button
      type="button"
      ref={handleRef}
      {...dragProps}
      onClick={onClick}
      aria-label={`Move “${title}”`}
      aria-haspopup={menuExpanded === undefined ? undefined : "menu"}
      aria-expanded={menuExpanded}
      className={`-ml-1 flex h-7 w-5 flex-shrink-0 cursor-grab touch-none items-center justify-center rounded-md outline-none! transition-[opacity,color,background-color] focus-visible:shadow-focus pointer-coarse:h-9 pointer-coarse:w-7 ${
        active
          ? "bg-accent/15 text-accent"
          : "text-faint hover:bg-line-strong hover:text-base-content pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 pointer-fine:focus-visible:opacity-100"
      } ${className}`}
    >
      <GripVertical size={14} aria-hidden="true" />
    </button>
  );
}

/**
 * Keeps a card's status circle aligned when its task can't be dragged (a recurring
 * occurrence or a done task next to movable ones): same width as `DragHandle`,
 * invisible and ignored by screen readers.
 */
export function DragHandleSpacer() {
  return <span aria-hidden="true" className="-ml-1 w-5 flex-shrink-0 pointer-coarse:w-7" />;
}
