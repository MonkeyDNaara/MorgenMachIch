"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { useQuickAdd } from "@/components/quickadd/useQuickAdd";
import QuickAddHighlight from "@/components/quickadd/QuickAddHighlight";
import QuickAddChips from "@/components/quickadd/QuickAddChips";
import TagSuggestionList from "@/components/quickadd/TagSuggestionList";
import { useTagAutocomplete } from "@/components/quickadd/useTagAutocomplete";
import { tokenLabel } from "@/components/quickadd/tokenDisplay";
import { FIELD_FOCUS } from "@/lib/ui/fieldFocus";
import { tintChipStyle } from "@/lib/ui/colorChip";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import { formatQuickAddDue } from "@/lib/utils/formatQuickAddDue";
import { formatRecurrenceRule } from "@/lib/utils/formatRecurrenceRule";
import type { QuickAddResult } from "@/lib/utils/parseQuickAdd";
import { DEMO_EXAMPLES, DEMO_LABELS } from "@/lib/site/quickAddDemo";

/** Same padding on the input and the highlight layer (see QuickAddInput). */
const PADDING = "pl-10 pr-3";

/**
 * The landing page's live quick-add (#86): the app's real parser, highlight
 * layer, chips and "#"/"!" autocomplete, with a fixed label list instead of
 * the database. Nothing is saved; a preview card shows what the text would
 * become. Loaded lazily by QuickAddDemoLoader, so chrono-node isn't part of
 * the page's first load.
 */
export default function QuickAddDemo() {
  const { text, setText, result, toggleIgnore } = useQuickAdd(DEMO_LABELS, {
    recurrence: true,
    initialText: DEMO_EXAMPLES[0],
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const chipsId = useId();
  const autocomplete = useTagAutocomplete({ text, setText, labels: DEMO_LABELS, inputRef });
  const now = new Date();

  useLayoutEffect(() => {
    if (layerRef.current && inputRef.current) {
      layerRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  });

  const summary = result.tokens.length
    ? `Recognised: ${result.tokens.map((token) => tokenLabel(token, DEMO_LABELS, now)).join(", ")}.`
    : "Nothing recognised yet.";

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
          }}
          onKeyDown={(event) => {
            if (autocomplete.handleKeyDown(event)) return;
            if (event.key === "Enter") event.preventDefault();
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
          aria-label="Try the quick-add: type a task with a date, #label or !priority"
          aria-describedby={chipsId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={autocomplete.open}
          aria-controls={autocomplete.listId}
          aria-activedescendant={
            autocomplete.open ? autocomplete.optionId(autocomplete.selected) : undefined
          }
          autoComplete="off"
          spellCheck={false}
          className={`input input-md w-full text-base ${PADDING} text-transparent caret-accent ${FIELD_FOCUS}`}
        />
        <div
          ref={layerRef}
          aria-hidden
          className={`input input-md pointer-events-none absolute inset-0 w-full overflow-hidden border-transparent bg-transparent text-base ${PADDING} shadow-none`}
        >
          <span className="whitespace-pre">
            <QuickAddHighlight
              text={text}
              tokens={result.tokens}
              labels={DEMO_LABELS}
              placeholder="Type a task…"
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
        <TagSuggestionList autocomplete={autocomplete} variant="popover" />
      </div>

      <QuickAddChips
        id={chipsId}
        tokens={result.tokens}
        ignoredTokens={result.ignoredTokens}
        labels={DEMO_LABELS}
        now={now}
        onToggle={toggleIgnore}
      />
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-meta text-subtle">Try:</span>
        {DEMO_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              // Focus stays on the button (easy to try the next one); with the
              // caret reset, the "!"/"#" list doesn't pop up over the chips.
              setText(example);
              autocomplete.resetCaret();
            }}
            className="cursor-pointer rounded-lg border border-line-strong bg-base-200 px-2.5 py-1 font-mono text-meta text-muted outline-none! transition-colors hover:text-base-content focus-visible:shadow-focus"
          >
            {example}
          </button>
        ))}
      </div>

      <PreviewCard result={result} now={now} />
    </div>
  );
}

/** What the text would become, drawn like a task card. */
function PreviewCard({ result, now }: { result: QuickAddResult; now: Date }) {
  if (!result.title) return null;
  const ring = PRIORITY_DOT_COLORS[result.priority ?? "none"] ?? "var(--color-line-strong)";
  const labels = DEMO_LABELS.filter((label) => result.labelIds.includes(label.id));
  const when = result.recurrence
    ? `↻ ${formatRecurrenceRule(result.recurrence)}${
        result.dueDate ? ` · first ${formatQuickAddDue(result.dueDate, result.allDay, now)}` : ""
      }`
    : result.dueDate
      ? formatQuickAddDue(result.dueDate, result.allDay, now)
      : "No date";

  return (
    <div className="mt-6">
      <p className="mb-2 font-mono text-eyebrow text-muted uppercase">Becomes</p>
      <div className="flex max-w-xl flex-wrap items-center gap-x-3 gap-y-1.5 surface-raised px-4 py-3">
        <span
          aria-hidden
          className="size-[18px] shrink-0 rounded-full border-2"
          style={{ borderColor: ring }}
        />
        <span className="text-body">{result.title}</span>
        {labels.map((label) => (
          <span
            key={label.id}
            className="rounded-full px-2 py-0.5 text-meta font-medium"
            style={tintChipStyle(label.color)}
          >
            {label.name}
          </span>
        ))}
        <span className="ml-auto font-mono text-meta text-accent">{when}</span>
      </div>
    </div>
  );
}
