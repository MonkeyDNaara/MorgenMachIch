"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Label } from "@/lib/types";
import { getLabels } from "@/lib/db/labels";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";
import { getQuickAddSuggestions, type QuickAddSuggestion } from "@/lib/utils/quickAddSuggestions";
import type { QuickAddResult } from "@/lib/utils/parseQuickAdd";
import { useQuickAdd } from "@/components/quickadd/useQuickAdd";
import QuickAddHighlight from "@/components/quickadd/QuickAddHighlight";
import QuickAddChips from "@/components/quickadd/QuickAddChips";

const NO_LABELS: Label[] = [];

type QuickAddInputProps = {
  /** Called with the parse result on Enter (never with an empty title).
   * Resolve to clear the field; reject to keep the text, e.g. after a
   * failed save — the caller shows its own error message. */
  onSubmit: (result: QuickAddResult) => Promise<void> | void;
  /** Where a task without a date lands, shown as "→ Today" / "→ Backlog". */
  defaultHint: string;
  placeholder: string;
  ariaLabel: string;
  size?: "sm" | "md";
  /** Called on every edit, e.g. to clear a status message. */
  onEdit?: () => void;
};

const SIZE_CLASSES = { sm: "input-sm", md: "input-md" } as const;

/**
 * Quick-add field with natural-language parsing (#203). Typing
 * "Call mom fri 3pm #family !high" colors the date, label and priority as
 * you type, shows a chip per match underneath (click to ignore), and
 * offers existing labels after "#" and priorities after "!". Enter hands the parse result to the
 * caller, which decides what to create — the field itself never saves.
 *
 * How the coloring works: a real <input> with transparent text sits on top
 * of QuickAddHighlight, which draws the same text in the same font and
 * padding. The input keeps everything native (caret, selection, IME,
 * screen readers); horizontal scroll is mirrored onto the highlight layer.
 */
export default function QuickAddInput({
  onSubmit,
  defaultHint,
  placeholder,
  ariaLabel,
  size = "md",
  onEdit,
}: QuickAddInputProps) {
  const labels = useLiveQuery(() => getLabels(), []) ?? NO_LABELS;
  const { text, setText, result, toggleIgnore, reset } = useQuickAdd(labels);
  const [caret, setCaret] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const chipsId = useId();

  // Autocomplete: labels after "#", priorities after "!" (before the caret).
  const found = getQuickAddSuggestions(text.slice(0, caret), labels);
  const tagStart = found ? found.start : null;
  const suggestions = found && found.start !== dismissedAt ? found.items : [];
  const open = suggestions.length > 0;
  const selected = Math.min(activeIndex, suggestions.length - 1);

  const hasDate = result.tokens.some((token) => token.kind === "date");

  // After every render (before paint): keep the highlight layer scrolled
  // like the input, and move the autocomplete under the "#". Written to the
  // DOM directly — it is pure layout, so it needs no React state.
  useLayoutEffect(() => {
    const input = inputRef.current;
    const layer = layerRef.current;
    if (!input || !layer) return;
    layer.scrollLeft = input.scrollLeft;
    if (anchorRef.current && listRef.current) {
      const left = anchorRef.current.offsetLeft - input.scrollLeft;
      const max = input.offsetWidth - listRef.current.offsetWidth;
      listRef.current.style.left = `${Math.max(0, Math.min(left, max))}px`;
    }
  });

  function syncCaret() {
    const input = inputRef.current;
    if (input) setCaret(input.selectionStart ?? input.value.length);
  }

  function pickSuggestion(suggestion: QuickAddSuggestion) {
    if (tagStart === null) return;
    const before = `${text.slice(0, tagStart)}${suggestion.insert} `;
    const next = before + text.slice(caret).replace(/^\S*\s?/, "");
    setText(next);
    setActiveIndex(0);
    // Put the caret right after the inserted tag once React has rendered.
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(before.length, before.length);
      setCaret(before.length);
    });
  }

  async function submit() {
    if (!result.title || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(result);
      reset();
      setCaret(0);
    } catch {
      // Keep the text so nothing is lost; the caller shows the error.
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((selected + step + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pickSuggestion(suggestions[selected]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation(); // close only the list, not a surrounding dialog
        setDismissedAt(tagStart);
        return;
      }
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    } else if (event.key === "Escape" && text) {
      event.preventDefault();
      event.stopPropagation();
      reset();
      setCaret(0);
      onEdit?.();
    }
  }

  const sizeClass = SIZE_CLASSES[size];
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setCaret(event.target.selectionStart ?? event.target.value.length);
            setDismissedAt(null);
            setActiveIndex(0);
            onEdit?.();
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={syncCaret}
          onClick={syncCaret}
          onSelect={syncCaret}
          onScroll={() => {
            if (layerRef.current && inputRef.current) {
              layerRef.current.scrollLeft = inputRef.current.scrollLeft;
            }
          }}
          onBlur={() => setDismissedAt(tagStart)}
          readOnly={submitting} // not disabled: disabling would drop focus
          aria-label={ariaLabel}
          aria-describedby={result.tokens.length ? chipsId : undefined}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? `${listId}-${selected}` : undefined}
          autoComplete="off"
          spellCheck={false}
          className={`input ${sizeClass} ${textSize} w-full pr-24 text-transparent caret-primary ${FIELD_FOCUS}`}
        />
        <div
          ref={layerRef}
          aria-hidden
          className={`input ${sizeClass} ${textSize} pointer-events-none absolute inset-0 w-full overflow-hidden border-transparent bg-transparent pr-24 shadow-none`}
        >
          <span className="whitespace-pre">
            <QuickAddHighlight
              text={text}
              tokens={result.tokens}
              labels={labels}
              placeholder={placeholder}
              anchorIndex={open ? tagStart : null}
              anchorRef={anchorRef}
            />
          </span>
        </div>
        {!hasDate && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-base-content/40"
          >
            → {defaultHint}
          </span>
        )}

        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={found?.kind === "priority" ? "Priorities" : "Labels"}
          hidden={!open}
          className="absolute top-full z-20 mt-1.5 w-56 rounded-xl border border-base-300 bg-base-100 p-1 shadow-[0_10px_28px_rgba(0,0,0,0.5)]"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === selected}
              onMouseDown={(event) => {
                event.preventDefault(); // keep focus in the input
                pickSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                index === selected ? "bg-base-300" : ""
              }`}
            >
              <span
                className="size-2 shrink-0 rounded-full bg-base-content/30"
                style={suggestion.color ? { backgroundColor: suggestion.color } : undefined}
                aria-hidden
              />
              <span className="truncate">{suggestion.name}</span>
              <span className="ml-auto font-mono text-[10px] text-base-content/40">
                {index === selected ? "↵ Tab" : suggestion.hint}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <QuickAddChips
        id={chipsId}
        tokens={result.tokens}
        ignoredTokens={result.ignoredTokens}
        labels={labels}
        now={new Date()}
        onToggle={toggleIgnore}
      />
    </div>
  );
}
