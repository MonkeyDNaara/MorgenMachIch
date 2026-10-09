"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
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

/** Identical on the input and the highlight layer (#238): room for the "+"
 * on the left and, from sm up, for the "→ Today" hint on the right. */
const PADDING = "pl-10 pr-3 sm:pr-24";

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
          className={`input ${sizeClass} ${textSize} w-full ${PADDING} text-transparent caret-accent ${FIELD_FOCUS}`}
        />
        <div
          ref={layerRef}
          aria-hidden
          className={`input ${sizeClass} ${textSize} pointer-events-none absolute inset-0 w-full overflow-hidden border-transparent bg-transparent ${PADDING} shadow-none`}
        >
          <span className="whitespace-pre">
            <QuickAddHighlight
              text={text}
              tokens={result.tokens}
              labels={labels}
              placeholder={
                <>
                  <span className="sm:hidden">Add a task…</span>
                  <span className="hidden sm:inline">{placeholder}</span>
                </>
              }
              anchorIndex={autocomplete.anchorIndex}
              anchorRef={autocomplete.anchorRef}
            />
          </span>
        </div>
        <Plus
          aria-hidden
          size={18}
          strokeWidth={2.2}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-primary"
        />
        {!hasDate && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 font-mono text-xs text-base-content/40 sm:block"
          >
            → {defaultHint}
          </span>
        )}

        <TagSuggestionList autocomplete={autocomplete} variant="popover" />
      </div>

      {/* Below sm the hint moves under the field so it can never overlap the text. */}
      {!hasDate && (
        <p aria-hidden className="mt-1.5 font-mono text-meta text-base-content/50 sm:hidden">
          → {defaultHint} · try “gym tue 7am #health”
        </p>
      )}

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
