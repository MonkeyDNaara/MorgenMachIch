"use client";

import { useRef, type KeyboardEvent } from "react";
import { nextRadioIndex } from "@/lib/utils/radioGroupKeys";

type Options = {
  /** Number of radios in the group. */
  count: number;
  /** Index of the checked radio, or -1 when nothing is checked. */
  selectedIndex: number;
  /** Selects the radio at this index (the group's own onChange). */
  onSelect: (index: number) => void;
};

/**
 * Keyboard behaviour for a `role="radiogroup"` (#272), shared by every
 * segmented control and option list in the app so the logic exists once:
 * roving tabindex (only the checked radio is a tab stop — the first one
 * when nothing is checked), and the arrow keys plus Home/End select an
 * option and move the focus to it together. Markup and styling stay with
 * each component: spread `groupProps` on the group element and
 * `itemProps(index)` on each radio. `focus()` also scrolls a radio into
 * view inside a horizontally scrolling group.
 */
export function useRadioGroupKeys({ count, selectedIndex, onSelect }: Options) {
  const items = useRef<(HTMLElement | null)[]>([]);
  const tabStop = selectedIndex >= 0 && selectedIndex < count ? selectedIndex : 0;

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const next = nextRadioIndex(event.key, selectedIndex, count);
    if (next === null) return;
    event.preventDefault();
    onSelect(next);
    items.current[next]?.focus();
  }

  function itemProps(index: number) {
    return {
      ref: (element: HTMLElement | null) => {
        items.current[index] = element;
      },
      tabIndex: index === tabStop ? 0 : -1,
    };
  }

  return { groupProps: { onKeyDown }, itemProps };
}
