import type { Label, Priority } from "@/lib/types";
import { PRIORITY_DOT_COLORS } from "@/lib/constants/priorityColors";
import { rankByQuery } from "@/features/command-palette/lib/fuzzyMatch";
import {
  canBeLabelTag,
  normalizeLabelName,
  pickLabelColors,
  tagToLabelName,
} from "@/lib/domain/labelNames";

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
  /** A `#tag` that matches no label: the label Enter will create (#283),
   * shown as a passive hint — not an option, so Enter still submits. */
  newLabel: { name: string; color: string } | null;
};

const ANY_TAG = /(^|\s)#([\p{L}\p{N}_-]+)/gu;

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
 * The label a typed `#tag` would create (#283), or null when it matches an
 * existing label or has no letter. Its color counts the other new tags
 * before it, so the hint shows the same color as the chip.
 */
function newLabelHint(
  query: string,
  textBefore: string,
  labels: Label[],
): { name: string; color: string } | null {
  if (!canBeLabelTag(query)) return null;
  const known = new Set(labels.map((label) => normalizeLabelName(label.name)));
  const key = normalizeLabelName(query);
  if (known.has(key)) return null;
  const earlier = new Set<string>();
  for (const match of textBefore.matchAll(ANY_TAG)) {
    const other = normalizeLabelName(match[2]);
    if (!known.has(other) && canBeLabelTag(match[2]) && other !== key) earlier.add(other);
  }
  const color = pickLabelColors(
    labels.map((label) => label.color),
    earlier.size + 1,
  )[earlier.size];
  return { name: tagToLabelName(query), color };
}

/**
 * What the quick-add autocomplete should offer for the text before the
 * caret: labels after "#", priorities after "!", or null when no tag is
 * being typed. Also null once the typed tag is already complete (e.g.
 * "#family" for an existing label, or "!high"), so Enter submits the task
 * instead of re-inserting the same tag. A tag that matches no label gets a
 * `newLabel` hint (#283) — then the result may have no items at all.
 */
export function getQuickAddSuggestions(
  textBeforeCaret: string,
  labels: Label[],
): QuickAddSuggestions | null {
  const match = TAG_BEFORE_CARET.exec(textBeforeCaret);
  if (!match) return null;

  const [, lead, trigger, query] = match;
  const kind = trigger === "#" ? "label" : "priority";
  const start = (match.index ?? 0) + lead.length;
  const items = kind === "label" ? labelSuggestions(query, labels) : prioritySuggestions(query);
  const newLabel =
    kind === "label" ? newLabelHint(query, textBeforeCaret.slice(0, start), labels) : null;
  if (items.length === 0 && !newLabel) return null;

  const typed = `${trigger}${query}`.toLowerCase();
  const complete =
    items.some((item) => item.insert === typed) ||
    (kind === "priority" && /^!(med|[123])$/.test(typed));
  if (complete) return null;

  return { start, kind, items, newLabel };
}
