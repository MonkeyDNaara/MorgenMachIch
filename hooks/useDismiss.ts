"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes a small popover on an outside pointer press or Escape (#236).
 * `refs` are the elements that count as "inside" (the popover and the
 * button that toggles it); Escape also moves focus back to `returnFocus`.
 * Plain state instead of daisyUI's focus-based dropdown, which closes as
 * soon as focus moves into a native date picker or select inside it.
 */
export function useDismiss(
  open: boolean,
  close: () => void,
  refs: RefObject<HTMLElement | null>[],
  returnFocus?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      returnFocus?.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // refs are stable ref objects; close may be a new function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
