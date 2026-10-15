"use client";

import { useMemo, useState } from "react";
import type { Label } from "@/lib/types";
import { parseQuickAdd } from "@/lib/utils/parseQuickAdd";

const NO_IGNORED: ReadonlySet<string> = new Set();

/**
 * State for a quick-add field (#203): the raw text, the ids of tokens the
 * user chose to ignore, and the parse result. Kept separate from the input
 * component so the palette (#204) and the task drawer (#206) can drive
 * their own inputs with the same behaviour.
 *
 * Ignores are tied to the token's text (see parseQuickAdd), so they survive
 * typing elsewhere in the field. Whenever the text changes, ignored ids
 * that no longer match anything are dropped — otherwise deleting "fri" and
 * typing it again later would bring the old ignore back.
 *
 * `recurrence: true` lets the parse find "every mon" phrases (#274) — only
 * for fields whose caller can create a series (bars and palette, #275);
 * `newLabels: true` reports unknown `#tags` as labels to create (#283);
 * `initialText` pre-fills the field (the landing page demo, #86).
 */
export function useQuickAdd(
  labels: Label[],
  { recurrence = false, newLabels = false, initialText = "" } = {},
) {
  const [text, setTextState] = useState(initialText);
  const [ignored, setIgnored] = useState<ReadonlySet<string>>(NO_IGNORED);

  const result = useMemo(
    () => parseQuickAdd(text, { now: new Date(), labels, ignored, recurrence, newLabels }),
    [text, labels, ignored, recurrence, newLabels],
  );

  function setText(next: string) {
    setTextState(next);
    if (ignored.size === 0) return;
    const stillMatching = parseQuickAdd(next, {
      now: new Date(),
      labels,
      ignored,
      recurrence,
      newLabels,
    }).ignoredTokens;
    setIgnored(new Set(stillMatching.map((token) => token.id)));
  }

  function toggleIgnore(id: string) {
    setIgnored((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setTextState("");
    setIgnored(NO_IGNORED);
  }

  return { text, setText, result, toggleIgnore, reset };
}
