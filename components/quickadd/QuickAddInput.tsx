"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Label } from "@/lib/types";
import { getLabels } from "@/lib/db/labels";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";
import type { QuickAddResult } from "@/lib/utils/parseQuickAdd";
import { useQuickAdd } from "@/components/quickadd/useQuickAdd";
import QuickAddHighlight from "@/components/quickadd/QuickAddHighlight";
import QuickAddChips from "@/components/quickadd/QuickAddChips";
import TagSuggestionList from "@/components/quickadd/TagSuggestionList";
import { useTagAutocomplete } from "@/components/quickadd/useTagAutocomplete";

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
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const chipsId = useId();
  const autocomplete = useTagAutocomplete({ text, setText, labels, inputRef });

  const hasDate = result.tokens.some((token) => token.kind === "date");

  // Keep the highlight layer scrolled like the input (before paint).
  useLayoutEffect(() => {
    if (layerRef.current && inputRef.current) {
      layerRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  });

  async function submit() {
    if (!result.title || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(result);
      reset();
      autocomplete.resetCaret();
    } catch {
      // Keep the text so nothing is lost; the caller shows the error.
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (autocomplete.handleKeyDown(event)) return;
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    } else if (event.key === "Escape" && text) {
      event.preventDefault();
      event.stopPropagation();
      reset();
      autocomplete.resetCaret();
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
            autocomplete.onInputChange(event.target);
            onEdit?.();
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={autocomplete.syncCaret}
          onClick={autocomplete.syncCaret}
          onSelect={autocomplete.syncCaret}
          onScroll={() => {
            if (layerRef.current && inputRef.current) {
              layerRef.current.scrollLeft = inputRef.current.scrollLeft;
            }
          }}
          onBlur={autocomplete.dismiss}
          readOnly={submitting} // not disabled: disabling would drop focus
          aria-label={ariaLabel}
          aria-describedby={result.tokens.length ? chipsId : undefined}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={autocomplete.open}
          aria-controls={autocomplete.listId}
          aria-activedescendant={
            autocomplete.open ? autocomplete.optionId(autocomplete.selected) : undefined
          }
          autoComplete="off"
          spellCheck={false}
          className={`input ${sizeClass} ${textSize} w-full pr-24 text-transparent caret-accent ${FIELD_FOCUS}`}
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
              anchorIndex={autocomplete.anchorIndex}
              anchorRef={autocomplete.anchorRef}
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

        <TagSuggestionList autocomplete={autocomplete} variant="popover" />
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
