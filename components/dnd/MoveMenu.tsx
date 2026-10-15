"use client";

import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { MOVE_ACTIONS, type MoveAction } from "@/lib/utils/listMove";
import { useDismiss } from "@/hooks/useDismiss";

type MoveMenuProps = {
  open: boolean;
  onClose: () => void;
  onMove: (action: MoveAction) => void;
  /** Which actions are possible right now (the edges disable some). */
  canMove: (action: MoveAction) => boolean;
  /** The grip that opened the menu: counts as "inside" and gets focus back. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Task title, for the menu's accessible name. */
  title: string;
};

/**
 * The single-pointer alternative to dragging (#73, WCAG 2.5.7): clicking
 * the grip opens Move to top / up / down / bottom. A `role="menu"` with
 * the usual keys — ↑/↓ between enabled items (wrapping), Home/End, Enter
 * or Space to choose, Escape or an outside click to close (focus returns
 * to the grip). The first enabled item gets focus when it opens.
 */
export default function MoveMenu({
  open,
  onClose,
  onMove,
  canMove,
  anchorRef,
  title,
}: MoveMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(open, onClose, [menuRef, anchorRef], anchorRef);

  useEffect(() => {
    if (open) enabledItems(menuRef.current)[0]?.focus();
  }, [open]);

  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = enabledItems(menuRef.current);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    items[next].focus();
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Move “${title}”`}
      onKeyDown={handleKeyDown}
      className="absolute left-0 top-full z-20 mt-1 w-44 rounded-box border border-line-strong bg-base-200 p-1 shadow-overlay"
    >
      {MOVE_ACTIONS.map(({ action, label }) => {
        const enabled = canMove(action);
        return (
          <button
            key={action}
            type="button"
            role="menuitem"
            disabled={!enabled}
            onClick={() => {
              onClose();
              anchorRef.current?.focus();
              onMove(action);
            }}
            className="flex w-full cursor-pointer items-center rounded-field px-2.5 py-1.5 text-left text-sm outline-none! transition-colors hover:bg-line-strong focus-visible:bg-line-strong disabled:cursor-default disabled:text-faint disabled:hover:bg-transparent"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function enabledItems(menu: HTMLElement | null): HTMLButtonElement[] {
  return menu
    ? [...menu.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)")]
    : [];
}
