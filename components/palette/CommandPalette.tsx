"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Label } from "@/lib/types";
import { getLabels } from "@/lib/db/labels";
import { parseQuickAdd } from "@/lib/utils/parseQuickAdd";
import { tintChipStyle } from "@/lib/ui/colorChip";
import QuickAddHighlight from "@/components/quickadd/QuickAddHighlight";
import TagSuggestionList from "@/components/quickadd/TagSuggestionList";
import { useTagAutocomplete } from "@/components/quickadd/useTagAutocomplete";
import { useCommandPalette } from "@/components/palette/CommandPaletteProvider";
import { usePaletteItems } from "@/components/palette/usePaletteItems";
import HighlightedText from "@/components/palette/HighlightedText";
import PriorityDot from "@/components/task/PriorityDot";
import type { PaletteItem } from "@/components/palette/types";
import { groupPaletteResults } from "@/lib/utils/groupPaletteResults";
import { useModKey } from "@/lib/ui/useModKey";
import { matchWithKeywords, type FuzzyMatch } from "@/lib/utils/fuzzyMatch";

/** Order of the group headings; anything not listed comes last. */
const GROUP_ORDER = ["Pages", "Actions", "Tasks"];
/** Best results kept per group, so a long task list stays fast and scannable. */
const MAX_PER_GROUP = 8;
/** Score for pinned rows: always listed, after every real match in the group. */
const PINNED_SCORE = -1_000_000;
const NO_LABELS: Label[] = [];

function matchItem(item: PaletteItem, query: string): FuzzyMatch | null {
  if (item.pinned) return { score: PINNED_SCORE, indices: [] };
  const match = matchWithKeywords(query, item.label, item.keywords);
  return match && { ...match, score: match.score - (item.rankPenalty ?? 0) };
}

/**
 * The command palette dialog (#195). A native <dialog> opened with
 * showModal(), which gives for free what a hand-rolled overlay would have
 * to rebuild: focus trapped inside, the page behind inert, Escape to
 * close, and focus restored to whatever opened it. Only the open/close
 * sync, the backdrop click and the upper-third placement are ours.
 *
 * The body is mounted only while open, so the query and selection reset
 * on every opening without any cleanup code. The confirmation notice
 * (#197) lives outside the dialog because it is shown after it closes.
 */
export default function CommandPalette() {
  const { isOpen, closePalette, notice } = useCommandPalette();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-label="Command palette"
        onClose={closePalette}
        // The dialog has no padding, so a mousedown that lands on the dialog
        // element itself (not a child) is a click on the backdrop.
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePalette();
        }}
        className="mx-auto mb-auto mt-[15vh] w-[calc(100%-2rem)] max-w-[560px] overflow-hidden rounded-box border border-line-strong bg-base-200 p-0 text-base-content shadow-overlay backdrop:bg-scrim backdrop:backdrop-blur-[2px]"
      >
        {isOpen && <PaletteBody onClose={closePalette} />}
      </dialog>
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 md:bottom-6 flex justify-center px-4"
      >
        {notice && (
          <p className="rounded-full border border-line-strong bg-base-300 px-4 py-2 text-sm shadow-overlay">
            {notice}
          </p>
        )}
      </div>
    </>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const labels = useLiveQuery(() => getLabels(), []) ?? NO_LABELS;
  // Quick-add parse of the query (#204): feeds the Add row and the token
  // colors, and once it finds tokens, search uses the title without them
  // so "Call mom fri 3pm" still lists an existing "Call mom".
  const quickAdd = useMemo(
    () => parseQuickAdd(query, { now: new Date(), labels }),
    [query, labels],
  );
  // Only tokens and no title ("today", "tomorrow") stays a plain search,
  // so typing "today" still finds the Today page.
  const searchText = quickAdd.tokens.length > 0 && quickAdd.title ? quickAdd.title : query;
  const items = usePaletteItems(query, quickAdd, labels);
  const inputRef = useRef<HTMLInputElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  // Selection is tracked by item id, not position, so a task that moves
  // after Cmd/Ctrl+Enter (done tasks rank lower) stays selected.
  const [activeId, setActiveId] = useState<string | null>(null);
  // "#" label / "!" priority suggestions, shared with QuickAddInput. While
  // open they replace the results and take over ↑/↓/Enter/Tab/Escape.
  const tags = useTagAutocomplete({
    text: query,
    setText: (next) => {
      setQuery(next);
      setActiveId(null);
    },
    labels,
    inputRef,
  });
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const listId = useId();
  const modKey = useModKey();

  const groups = useMemo(
    () =>
      groupPaletteResults(items, (item) => matchItem(item, searchText), GROUP_ORDER, MAX_PER_GROUP),
    [items, searchText],
  );
  const flat = groups.flatMap((group) => group.entries);
  const found = flat.findIndex((entry) => entry.item.id === activeId);
  const preferred = flat.findIndex((entry) => entry.item.preferred);
  const active = found !== -1 ? found : preferred !== -1 ? preferred : bestMatchIndex(flat);
  const activeItem = flat[active]?.item;
  const optionId = (index: number) => `${listId}-option-${index}`;
  // Flat index of each group's first row, so rows get one running index across groups.
  const groupStarts = groups.map((_, i) =>
    groups.slice(0, i).reduce((count, group) => count + group.entries.length, 0),
  );

  useEffect(() => {
    document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  // Keep the token-color layer scrolled like the input (see QuickAddInput).
  useLayoutEffect(() => {
    if (layerRef.current && inputRef.current) {
      layerRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  });

  function select(index: number) {
    const entry = flat[index];
    if (entry) setActiveId(entry.item.id);
  }

  function runItem(index: number) {
    const entry = flat[index];
    if (!entry) return;
    onClose();
    entry.item.run();
  }

  function runAlternate(index: number) {
    const alternate = flat[index]?.item.alternate;
    if (!alternate) return;
    alternate.run();
    setAnnouncement(alternate.label);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return; // Enter confirms an IME composition, not a command
    if (tags.handleKeyDown(event)) return;
    if (event.key === "ArrowDown" && flat.length > 0) {
      event.preventDefault();
      select((active + 1) % flat.length);
    } else if (event.key === "ArrowUp" && flat.length > 0) {
      event.preventDefault();
      select((active - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (event.metaKey || event.ctrlKey) runAlternate(active);
      else runItem(active);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Search size={16} className="flex-shrink-0 text-base-content/40" aria-hidden />
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              tags.onInputChange(event.target);
              setActiveId(null);
              setAnnouncement(null);
            }}
            onKeyDown={handleKeyDown}
            onKeyUp={tags.syncCaret}
            onClick={tags.syncCaret}
            onSelect={tags.syncCaret}
            onScroll={() => {
              if (layerRef.current && inputRef.current) {
                layerRef.current.scrollLeft = inputRef.current.scrollLeft;
              }
            }}
            placeholder="Search tasks or run a command…"
            aria-label="Search tasks and commands"
            role="combobox"
            aria-expanded={tags.open || flat.length > 0}
            aria-controls={tags.open ? tags.listId : flat.length > 0 ? listId : undefined}
            aria-activedescendant={
              tags.open
                ? tags.optionId(tags.selected)
                : flat.length > 0
                  ? optionId(active)
                  : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent font-mono text-sm text-transparent caret-accent outline-none! placeholder:text-base-content/30"
          />
          {/* Draws the query with quick-add tokens colored; the input's own text is transparent. */}
          <div
            ref={layerRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center overflow-hidden font-mono text-sm whitespace-pre"
          >
            <QuickAddHighlight text={query} tokens={quickAdd.tokens} labels={labels} />
          </div>
        </div>
      </div>

      {tags.open ? (
        <TagSuggestionList autocomplete={tags} variant="inline" />
      ) : flat.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Results"
          className="max-h-[min(50vh,24rem)] overflow-y-auto p-2"
        >
          {groups.map((group, groupIndex) => {
            const start = groupStarts[groupIndex];
            return (
              <li key={group.group} role="presentation">
                <p className="px-3 pb-1 pt-2 font-mono text-[11px] text-base-content/40">
                  {group.group}
                </p>
                <ul role="group" aria-label={group.group}>
                  {group.entries.map((entry, i) => {
                    const index = start + i;
                    const selected = index === active;
                    const { item } = entry;
                    const Icon = item.icon;
                    return (
                      <li
                        key={item.id}
                        id={optionId(index)}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => selected || select(index)}
                        onClick={() => runItem(index)}
                        className={`relative flex cursor-pointer items-center gap-3 rounded-field px-3 py-2 text-sm before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-0.5 before:rounded-full ${
                          selected ? "bg-accent/10 before:bg-accent" : "before:bg-transparent"
                        }`}
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.8}
                          aria-hidden
                          className={`flex-shrink-0 ${selected ? "text-accent" : "text-base-content/50"}`}
                        />
                        <span
                          className={`flex min-w-0 flex-1 items-center gap-1.5 ${
                            item.muted ? "text-base-content/50 line-through" : ""
                          }`}
                        >
                          {item.priority && <PriorityDot priority={item.priority} />}
                          <span className="min-w-0 truncate">
                            <HighlightedText text={item.label} indices={entry.indices} />
                          </span>
                          {item.chips?.map((chip) => (
                            <span
                              key={chip.key}
                              className="flex-shrink-0 rounded-full px-2 py-px text-[11px] font-medium whitespace-nowrap"
                              style={tintChipStyle(chip.color)}
                            >
                              {chip.text}
                            </span>
                          ))}
                        </span>
                        {item.hint && (
                          <span className="flex-shrink-0 font-mono text-xs text-base-content/40">
                            {item.hint}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-base-content/40">
          No results for “{query.trim()}”
        </p>
      )}

      <div
        aria-hidden
        className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2 font-mono text-[11px] text-base-content/40"
      >
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span>
          <Kbd>↵</Kbd> {tags.open ? "insert" : activeItem?.kind === "task" ? "open" : "run"}
        </span>
        {!tags.open && activeItem?.alternate && (
          <span>
            <Kbd>{modKey}</Kbd>
            <Kbd>↵</Kbd> {activeItem.muted ? "reopen" : "complete"}
          </span>
        )}
        <span>
          <Kbd>esc</Kbd> close
        </span>
      </div>

      <div role="status" className="sr-only">
        {announcement ??
          (flat.length === 0
            ? "No results"
            : `${flat.length} result${flat.length === 1 ? "" : "s"}`)}
      </div>
    </div>
  );
}

/**
 * Default selection: the best-scoring row across all groups (groups keep
 * their fixed order, so the best match is not always first). Pinned rows
 * never win, so typing an existing task's title selects that task instead
 * of "Add to backlog" and Enter can't create a duplicate by accident.
 * Ties keep the earliest row; with an empty query that is the first row.
 * (A `preferred` row — the Add row once quick-add found tokens, #204 —
 * overrides this; see PaletteBody.)
 */
function bestMatchIndex(entries: { score: number }[]): number {
  let best = 0;
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].score > entries[best].score) best = i;
  }
  return best;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-1 rounded border border-line-strong bg-base-300 px-1.5 py-0.5 font-mono text-[10px] text-base-content/60">
      {children}
    </kbd>
  );
}
