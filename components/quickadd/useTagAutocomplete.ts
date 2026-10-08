"use client";

import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Label } from "@/lib/types";
import { getQuickAddSuggestions, type QuickAddSuggestion } from "@/lib/utils/quickAddSuggestions";

type Options = {
  text: string;
  setText: (next: string) => void;
  labels: Label[];
  inputRef: RefObject<HTMLInputElement | null>;
};

/**
 * The "#" label / "!" priority autocomplete of a quick-add field (#203),
 * as a hook so both QuickAddInput and the command palette (#204) share the
 * same behaviour: which suggestions are open for the text before the
 * caret, the keyboard handling (↑/↓, Enter/Tab to insert, Escape to close
 * just the list) and inserting the chosen tag.
 *
 * The caller renders `TagSuggestionList`, passes `anchorIndex`/`anchorRef`
 * to QuickAddHighlight (so a popover list can sit under the "#"), calls
 * `handleKeyDown` first in its own key handler and `onInputChange` from
 * the input's onChange.
 */
export function useTagAutocomplete({ text, setText, labels, inputRef }: Options) {
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const found = getQuickAddSuggestions(text.slice(0, caret), labels);
  const tagStart = found ? found.start : null;
  const suggestions = found && found.start !== dismissedAt ? found.items : [];
  const open = suggestions.length > 0;
  const selected = Math.max(0, Math.min(activeIndex, suggestions.length - 1));

  // A popover list follows the "#" horizontally. Pure layout, so it is
  // written to the DOM directly after every render instead of via state.
  useLayoutEffect(() => {
    const input = inputRef.current;
    const anchor = anchorRef.current;
    const list = listRef.current;
    if (!input || !anchor || !list || list.dataset.variant !== "popover") return;
    const left = anchor.offsetLeft - input.scrollLeft;
    const max = input.offsetWidth - list.offsetWidth;
    list.style.left = `${Math.max(0, Math.min(left, max))}px`;
  });

  function syncCaret() {
    const input = inputRef.current;
    if (input) setCaret(input.selectionStart ?? input.value.length);
  }

  function onInputChange(input: HTMLInputElement) {
    setCaret(input.selectionStart ?? input.value.length);
    setDismissedAt(null);
    setActiveIndex(0);
  }

  function pick(suggestion: QuickAddSuggestion) {
    if (tagStart === null) return;
    const before = `${text.slice(0, tagStart)}${suggestion.insert} `;
    setText(before + text.slice(caret).replace(/^\S*\s?/, ""));
    setActiveIndex(0);
    // Put the caret right after the inserted tag once React has rendered.
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(before.length, before.length);
      setCaret(before.length);
    });
  }

  /** Handles the key if the list is open; returns true when it did. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): boolean {
    if (!open || event.nativeEvent.isComposing) return false;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((selected + step + suggestions.length) % suggestions.length);
    } else if ((event.key === "Enter" && !event.metaKey && !event.ctrlKey) || event.key === "Tab") {
      pick(suggestions[selected]);
    } else if (event.key === "Escape") {
      event.stopPropagation(); // close only the list, not a surrounding dialog
      setDismissedAt(tagStart);
    } else {
      return false;
    }
    event.preventDefault();
    return true;
  }

  return {
    open,
    kind: found?.kind ?? "label",
    suggestions,
    selected,
    listId,
    optionId: (index: number) => `${listId}-${index}`,
    anchorIndex: open ? tagStart : null,
    anchorRef,
    listRef,
    pick,
    hover: setActiveIndex,
    syncCaret,
    onInputChange,
    /** Close the list until the next edit, e.g. on blur. */
    dismiss: () => setDismissedAt(tagStart),
    resetCaret: () => setCaret(0),
    handleKeyDown,
  };
}

export type TagAutocomplete = ReturnType<typeof useTagAutocomplete>;
