import type { Label, Priority } from "@/lib/types";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import { rankByQuery } from "@/lib/utils/fuzzyMatch";

/** One entry in the quick-add autocomplete (#203). */
export type QuickAddSuggestion = {
  key: string;
  /** What replaces the typed tag, e.g. "#deep-work" or "!high". */
  insert: string;
  /** Visible name, e.g. "Deep work" or "High". */
  name: string;
  /** Dot color: the label's color or the priority's dot color. */
  color: string | null;
  /** Short extra text on the right, e.g. the "!1" shortcut. */
  hint?: string;
};

export type QuickAddSuggestions = {
  /** Index of the "#" / "!" that starts the tag being typed. */
  start: number;
  kind: "label" | "priority";
  items: QuickAddSuggestion[];
};

const MAX_SUGGESTIONS = 6;

// A "#tag" or "!priority" being typed right before the caret, starting a word.
const TAG_BEFORE_CARET = /(^|\s)([#!])([\p{L}\p{N}_-]*)$/u;
// Only labels whose name can be written as a tag are offered.
const TAGGABLE = /^[\p{L}\p{N}_-]+$/u;

const PRIORITY_OPTIONS: { priority: Exclude<Priority, "none">; word: string; digit: string }[] = [
  { priority: "high", word: "high", digit: "1" },
  { priority: "medium", word: "medium", digit: "2" },
  { priority: "low", word: "low", digit: "3" },
];

const PRIORITY_NAMES = { high: "High", medium: "Medium", low: "Low" } as const;

/** "Deep work" → "deep-work": the tag that matches a label (see parseQuickAdd). */
export function labelTag(label: Pick<Label, "name">): string {
  return label.name.trim().toLowerCase().replace(/\s+/g, "-");
}

function labelSuggestions(query: string, labels: Label[]): QuickAddSuggestion[] {
  const taggable = labels.filter((label) => TAGGABLE.test(labelTag(label)));
  return rankByQuery(taggable, query, labelTag)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ item }) => ({
      key: item.id,
      insert: `#${labelTag(item)}`,
      name: item.name,
      color: item.color,
    }));
}

function prioritySuggestions(query: string): QuickAddSuggestion[] {
  const q = query.toLowerCase();
  return PRIORITY_OPTIONS.filter(({ word, digit }) => word.startsWith(q) || digit === q).map(
    ({ priority, word, digit }) => ({
      key: priority,
      insert: `!${word}`,
      name: PRIORITY_NAMES[priority],
      color: PRIORITY_DOT_COLORS[priority],
      hint: `!${digit}`,
    }),
  );
}

/**
 * What the quick-add autocomplete should offer for the text before the
 * caret: labels after "#", priorities after "!", or null when no tag is
 * being typed. Also null once the typed tag is already complete (e.g.
 * "#family" for an existing label, or "!high"), so Enter submits the task
 * instead of re-inserting the same tag.
 */
export function getQuickAddSuggestions(
  textBeforeCaret: string,
  labels: Label[],
): QuickAddSuggestions | null {
  const match = TAG_BEFORE_CARET.exec(textBeforeCaret);
  if (!match) return null;

  const [, lead, trigger, query] = match;
  const kind = trigger === "#" ? "label" : "priority";
  const items = kind === "label" ? labelSuggestions(query, labels) : prioritySuggestions(query);
  if (items.length === 0) return null;

  const typed = `${trigger}${query}`.toLowerCase();
  const complete =
    items.some((item) => item.insert === typed) ||
    (kind === "priority" && /^!(med|[123])$/.test(typed));
  if (complete) return null;

  return { start: (match.index ?? 0) + lead.length, kind, items };
}
