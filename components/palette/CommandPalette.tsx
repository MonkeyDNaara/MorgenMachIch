"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useCommandPalette } from "@/components/palette/CommandPaletteProvider";
import { usePaletteItems } from "@/components/palette/usePaletteItems";
import HighlightedText from "@/components/palette/HighlightedText";
import { groupPaletteResults } from "@/lib/utils/groupPaletteResults";

/** Order of the group headings; anything not listed comes last. */
const GROUP_ORDER = ["Pages", "Actions", "Tasks"];

/**
 * The command palette dialog (#195). A native <dialog> opened with
 * showModal(), which gives for free what a hand-rolled overlay would have
 * to rebuild: focus trapped inside, the page behind inert, Escape to
 * close, and focus restored to whatever opened it. Only the open/close
 * sync, the backdrop click and the upper-third placement are ours.
 *
 * The body is mounted only while open, so the query and selection reset
 * on every opening without any cleanup code.
 */
export default function CommandPalette() {
  const { isOpen, closePalette } = useCommandPalette();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
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
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const items = usePaletteItems();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();

  const groups = useMemo(
    () => groupPaletteResults(items, query, (item) => item.label, GROUP_ORDER),
    [items, query],
  );
  const flat = groups.flatMap((group) => group.entries);
  // Results shrink while typing; keep the selection inside the new list.
  const active = Math.min(activeIndex, Math.max(flat.length - 1, 0));
  const optionId = (index: number) => `${listId}-option-${index}`;
  // Flat index of each group's first row, so rows get one running index across groups.
  const groupStarts = groups.map((_, i) =>
    groups.slice(0, i).reduce((count, group) => count + group.entries.length, 0),
  );

  useEffect(() => {
    document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  function runItem(index: number) {
    const entry = flat[index];
    if (!entry) return;
    onClose();
    entry.item.run();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return; // Enter confirms an IME composition, not a command
    if (event.key === "ArrowDown" && flat.length > 0) {
      event.preventDefault();
      setActiveIndex((active + 1) % flat.length);
    } else if (event.key === "ArrowUp" && flat.length > 0) {
      event.preventDefault();
      setActiveIndex((active - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      runItem(active);
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
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search or run a command…"
          aria-label="Search commands"
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
                    const Icon = entry.item.icon;
                    return (
                      <li
                        key={entry.item.id}
                        id={optionId(index)}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => selected || setActiveIndex(index)}
                        onClick={() => runItem(index)}
                        className={`relative flex cursor-pointer items-center gap-3 rounded-field px-3 py-2 text-sm before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-0.5 before:rounded-full ${
                          selected ? "bg-primary/10 before:bg-primary" : "before:bg-transparent"
                        }`}
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.8}
                          aria-hidden
                          className={selected ? "text-primary" : "text-base-content/50"}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          <HighlightedText text={entry.item.label} indices={entry.indices} />
                        </span>
                        {entry.item.hint && (
                          <span className="flex-shrink-0 font-mono text-xs text-base-content/40">
                            {entry.item.hint}
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
        className="flex items-center gap-4 border-t border-white/5 px-4 py-2 font-mono text-[11px] text-base-content/40"
      >
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span>
          <Kbd>↵</Kbd> run
        </span>
        <span>
          <Kbd>esc</Kbd> close
        </span>
      </div>

      <div role="status" className="sr-only">
        {flat.length === 0 ? "No results" : `${flat.length} result${flat.length === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-1 rounded border border-white/10 bg-base-300 px-1.5 py-0.5 font-mono text-[10px] text-base-content/60">
      {children}
    </kbd>
  );
}
