"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useCommandPalette } from "@/components/palette/CommandPaletteProvider";
import { usePaletteItems } from "@/components/palette/usePaletteItems";
import HighlightedText from "@/components/palette/HighlightedText";
import PriorityDot from "@/components/task/PriorityDot";
import type { PaletteItem } from "@/components/palette/types";
import { groupPaletteResults } from "@/lib/utils/groupPaletteResults";
import { matchWithKeywords, type FuzzyMatch } from "@/lib/utils/fuzzyMatch";

/** Order of the group headings; anything not listed comes last. */
const GROUP_ORDER = ["Pages", "Actions", "Tasks"];
/** Best results kept per group, so a long task list stays fast and scannable. */
const MAX_PER_GROUP = 8;
/** Score for pinned rows: always listed, after every real match in the group. */
const PINNED_SCORE = -1_000_000;

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
        className="mx-auto mb-auto mt-[15vh] w-[calc(100%-2rem)] max-w-[560px] overflow-hidden rounded-box border border-white/10 bg-base-200 p-0 text-base-content shadow-2xl shadow-black/60 backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
      >
        {isOpen && <PaletteBody onClose={closePalette} />}
      </dialog>
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {notice && (
          <p className="rounded-full border border-white/10 bg-base-300 px-4 py-2 text-sm shadow-lg shadow-black/40">
            {notice}
          </p>
        )}
      </div>
    </>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const items = usePaletteItems(query);
  // Selection is tracked by item id, not position, so a task that moves
  // after Cmd/Ctrl+Enter (done tasks rank lower) stays selected.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const listId = useId();
  // Read once per opening; the body only renders in the browser.
  const [modKey] = useState(() => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"));

  const groups = useMemo(
    () => groupPaletteResults(items, (item) => matchItem(item, query), GROUP_ORDER, MAX_PER_GROUP),
    [items, query],
  );
  const flat = groups.flatMap((group) => group.entries);
  const found = flat.findIndex((entry) => entry.item.id === activeId);
  const active = found === -1 ? bestMatchIndex(flat) : found;
  const activeItem = flat[active]?.item;
  const optionId = (index: number) => `${listId}-option-${index}`;
  // Flat index of each group's first row, so rows get one running index across groups.
  const groupStarts = groups.map((_, i) =>
    groups.slice(0, i).reduce((count, group) => count + group.entries.length, 0),
  );

  useEffect(() => {
    document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

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
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <Search size={16} className="flex-shrink-0 text-base-content/40" aria-hidden />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveId(null);
            setAnnouncement(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks or run a command…"
          aria-label="Search tasks and commands"
          role="combobox"
          aria-expanded={flat.length > 0}
          aria-controls={flat.length > 0 ? listId : undefined}
          aria-activedescendant={flat.length > 0 ? optionId(active) : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none! placeholder:text-base-content/30"
        />
      </div>

      {flat.length > 0 ? (
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
                          selected ? "bg-primary/10 before:bg-primary" : "before:bg-transparent"
                        }`}
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.8}
                          aria-hidden
                          className={`flex-shrink-0 ${selected ? "text-primary" : "text-base-content/50"}`}
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
        className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/5 px-4 py-2 font-mono text-[11px] text-base-content/40"
      >
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span>
          <Kbd>↵</Kbd> {activeItem?.kind === "task" ? "open" : "run"}
        </span>
        {activeItem?.alternate && (
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
    <kbd className="mr-1 rounded border border-white/10 bg-base-300 px-1.5 py-0.5 font-mono text-[10px] text-base-content/60">
      {children}
    </kbd>
  );
}
