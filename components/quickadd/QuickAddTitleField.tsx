"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Label } from "@/lib/types";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";
import { parseQuickAdd, type QuickAddResult } from "@/lib/utils/parseQuickAdd";
import QuickAddHighlight from "@/components/quickadd/QuickAddHighlight";
import QuickAddChips from "@/components/quickadd/QuickAddChips";
import TagSuggestionList from "@/components/quickadd/TagSuggestionList";
import { useTagAutocomplete } from "@/components/quickadd/useTagAutocomplete";

const NO_IGNORED: ReadonlySet<string> = new Set();

type QuickAddTitleFieldProps = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  labels: Label[];
  /** Called with the parse result when the user clicks Apply. The caller
   * copies the fields it wants into the form; the title gets the cleaned
   * version (`result.title`). */
  onApply: (result: QuickAddResult) => void;
  placeholder?: string;
};

/**
 * The task drawer's title field in create mode (#206): a controlled
 * version of QuickAddInput. Typing "Call mom fri 3pm #family !high" colors
 * the tokens and offers "#" / "!" suggestions like everywhere else, and a
 * "Detected" row underneath shows what was found. Nothing is filled in
 * until Apply is clicked — saving without it keeps the title exactly as
 * typed, since a title such as "Plan Friday party" may legitimately
 * contain a date word. Chips can be ignored first, like in the bars.
 */
export default function QuickAddTitleField({
  id,
  value,
  onChange,
  labels,
  onApply,
  placeholder,
}: QuickAddTitleFieldProps) {
  const [ignored, setIgnored] = useState<ReadonlySet<string>>(NO_IGNORED);
  const inputRef = useRef<HTMLInputElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const autocomplete = useTagAutocomplete({ text: value, setText: onChange, labels, inputRef });

  const result = useMemo(
    () => parseQuickAdd(value, { now: new Date(), labels, ignored }),
    [value, labels, ignored],
  );
  const hasSuggestions = result.tokens.length > 0 || result.ignoredTokens.length > 0;

  useLayoutEffect(() => {
    if (layerRef.current && inputRef.current) {
      layerRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  });

  function toggleIgnore(tokenId: string) {
    setIgnored((current) => {
      const next = new Set(current);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  }

  function apply() {
    onApply(result);
    setIgnored(NO_IGNORED);
    autocomplete.resetCaret();
  }

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next);
            autocomplete.onInputChange(event.target);
            // Drop ignores whose token no longer matches (see useQuickAdd).
            if (ignored.size > 0) {
              const still = parseQuickAdd(next, { now: new Date(), labels, ignored });
              setIgnored(new Set(still.ignoredTokens.map((token) => token.id)));
            }
          }}
          onKeyDown={(event) => {
            autocomplete.handleKeyDown(event);
          }}
          onKeyUp={autocomplete.syncCaret}
          onClick={autocomplete.syncCaret}
          onSelect={autocomplete.syncCaret}
          onScroll={() => {
            if (layerRef.current && inputRef.current) {
              layerRef.current.scrollLeft = inputRef.current.scrollLeft;
            }
          }}
          onBlur={autocomplete.dismiss}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={autocomplete.open}
          aria-controls={autocomplete.listId}
          aria-activedescendant={
            autocomplete.open ? autocomplete.optionId(autocomplete.selected) : undefined
          }
          autoComplete="off"
          spellCheck={false}
          className={`input w-full text-transparent caret-primary ${FIELD_FOCUS}`}
        />
        <div
          ref={layerRef}
          aria-hidden
          className="input pointer-events-none absolute inset-0 w-full overflow-hidden border-transparent bg-transparent shadow-none"
        >
          <span className="whitespace-pre">
            <QuickAddHighlight
              text={value}
              tokens={result.tokens}
              labels={labels}
              placeholder={placeholder}
              anchorIndex={autocomplete.anchorIndex}
              anchorRef={autocomplete.anchorRef}
            />
          </span>
        </div>
        <TagSuggestionList autocomplete={autocomplete} variant="popover" />
      </div>

      {hasSuggestions && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-xs text-base-content/50">Detected:</span>
          <QuickAddChips
            className="contents"
            tokens={result.tokens}
            ignoredTokens={result.ignoredTokens}
            labels={labels}
            now={new Date()}
            onToggle={toggleIgnore}
          />
          <button
            type="button"
            onClick={apply}
            disabled={result.tokens.length === 0}
            className="btn btn-primary btn-xs ml-1 gap-1"
          >
            <Sparkles size={12} aria-hidden />
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
