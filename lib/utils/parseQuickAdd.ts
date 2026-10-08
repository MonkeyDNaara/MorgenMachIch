import * as chrono from "chrono-node";
import type { Label, Priority } from "@/lib/types";

/**
 * Natural-language quick-add (#202): turns free text such as
 * "Call mom fri 3pm #family !high" into task fields. Pure and UI-free —
 * the clock and the label list come in as arguments — so every entry point
 * (palette, quick-add bars, task drawer) and a future API can share it.
 *
 * Understands three kinds of tokens:
 * - a date/time, English (en-GB, day before month) or German, via chrono-node
 * - `#label` for existing labels (unknown tags stay in the title)
 * - `!priority`: !high/!medium/!med/!low or !1/!2/!3 (1 = high)
 *
 * Every matched token is reported with its position so the UI can
 * highlight it, and any token can be ignored by passing its id back in
 * `ignored` — its text then stays in the title.
 */

export type QuickAddTokenKind = "date" | "label" | "priority";

type QuickAddTokenBase = {
  /** Stable while the token's text is unchanged — pass it back via `ignored`. */
  id: string;
  kind: QuickAddTokenKind;
  /** Range in the input text, end exclusive. */
  start: number;
  end: number;
  text: string;
};

/** A matched token plus the value it stands for, so the UI can render a
 * preview chip without parsing again (#203). */
export type QuickAddToken =
  | (QuickAddTokenBase & { kind: "date"; dueDate: string; allDay: boolean })
  | (QuickAddTokenBase & { kind: "label"; labelId: string })
  | (QuickAddTokenBase & { kind: "priority"; priority: Priority });

export type QuickAddResult = {
  /** Input without the matched tokens, whitespace collapsed. May be empty. */
  title: string;
  /** ISO datetime, or null when no date was found. */
  dueDate: string | null;
  /** True when the date has no explicit time ("fri", "morgen"). */
  allDay: boolean;
  labelIds: string[];
  /** null = no priority token, so the caller keeps its own default. */
  priority: Priority | null;
  /** Matched (not ignored) tokens, sorted by position. */
  tokens: QuickAddToken[];
  /** Tokens that matched but were skipped because their id is in
   * `ignored`, sorted by position — the UI shows them as "restore" chips.
   * An ignored id that no longer matches anything is simply absent, so the
   * caller can drop it. */
  ignoredTokens: QuickAddToken[];
};

export type QuickAddOptions = {
  now: Date;
  labels: Pick<Label, "id" | "name">[];
  ignored?: ReadonlySet<string>;
};

// --- dates ------------------------------------------------------------------

// German "12.10." (day.month. without a year) is common but chrono's German
// parser only knows it with a year, so add it. The trailing dot is required
// so version numbers and prices ("v2.10", "12.50") don't turn into dates.
const germanShortDate = chrono.de.casual.clone();
germanShortDate.parsers.push({
  pattern: () => /(\d{1,2})\.(\d{1,2})\.(?!\d)/,
  extract: (context, match) => {
    const before = context.text[(match.index ?? 0) - 1];
    if (before !== undefined && /[\d.]/.test(before)) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { day, month };
  },
});

const DATE_PARSERS = [chrono.en.GB, germanShortDate];

// Matches chrono finds that are almost always false positives in a task title.
const GERMAN_WEEKDAY_ABBREVIATION = /^(mo|di|mi|do|fr|sa|so)\.?$/i; // "Do the dishes", "So viel"
const BARE_DURATION =
  /^\d+(?:[.,]\d+)?\s*(?:s|sec|secs|seconds?|mins?|minutes?|h|hrs?|hours?|days?|weeks?|months?|years?|sekunden?|minuten?|std|stunden?|tage?n?|wochen?|monate?n?|jahre?n?)\b/i; // "1 hour workout" — "in 1 hour" is still a date
const GREETING_MORGEN = /guten\s+$/i; // "Guten Morgen sagen" is not "tomorrow"
const NEXT_WORD = /\b(next|nächste[nmrs]?|kommende[nmrs]?)\b/i;
// A preposition right before the date belongs to it ("by fri", "bis morgen").
const LEADING_PREPOSITION = /(?:^|\s)((?:by|until|till|due|on|at|bis|zum|am|um)\s+)$/i;

function isFalsePositive(result: chrono.ParsedResult, text: string): boolean {
  const matched = result.text.trim();
  if (GERMAN_WEEKDAY_ABBREVIATION.test(matched)) return true;
  if (BARE_DURATION.test(matched)) return true;
  if (/^morgen$/i.test(matched) && GREETING_MORGEN.test(text.slice(0, result.index))) return true;
  return false;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

/**
 * The date chrono resolved, with one correction: with `forwardDate` a bare
 * weekday that is today ("fri" on a Friday) jumps a week ahead, but we
 * decided it means today. "next fri" still means next week.
 */
function resolveDate(result: chrono.ParsedResult, now: Date): Date {
  const date = result.start.date();
  const bareWeekday =
    result.start.isCertain("weekday") &&
    !result.start.isCertain("day") &&
    !NEXT_WORD.test(result.text);
  if (bareWeekday && daysBetween(now, date) === 7) {
    date.setDate(date.getDate() - 7);
  }
  return date;
}

type DateCandidate = { start: number; end: number; result: chrono.ParsedResult };

function findDateCandidates(masked: string, now: Date): DateCandidate[] {
  const found: DateCandidate[] = [];
  for (const parser of DATE_PARSERS) {
    for (const result of parser.parse(masked, now, { forwardDate: true })) {
      if (isFalsePositive(result, masked)) continue;
      let start = result.index;
      const end = result.index + result.text.length;
      const preposition = LEADING_PREPOSITION.exec(masked.slice(0, start));
      if (preposition) start -= preposition[1].length;
      found.push({ start, end, result });
    }
  }
  // Earliest first; for the same start the longer match wins ("fri 3pm"
  // over "3pm"), and overlapping matches from the other language drop out.
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const candidates: DateCandidate[] = [];
  for (const candidate of found) {
    const previous = candidates[candidates.length - 1];
    if (previous && candidate.start < previous.end) continue;
    candidates.push(candidate);
  }
  return candidates;
}

// --- labels + priority ------------------------------------------------------

// A tag starts at the beginning of a word ("C#" is not a tag) and stops at
// punctuation ("#family," → "family").
const LABEL_TAG = /(^|\s)#([\p{L}\p{N}_-]+)/gu;
const PRIORITY_TAG = /(^|\s)!(high|medium|med|low|1|2|3)(?=$|[\s.,;:!?)])/giu;

const PRIORITY_BY_WORD: Record<string, Priority> = {
  high: "high",
  "1": "high",
  medium: "medium",
  med: "medium",
  "2": "medium",
  low: "low",
  "3": "low",
};

/** "Deep work", "deep-work" and "#DeepWork" all become "deepwork". */
function normalizeLabelName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}

// --- main -------------------------------------------------------------------

export function parseQuickAdd(text: string, options: QuickAddOptions): QuickAddResult {
  const { now, labels, ignored = new Set<string>() } = options;
  const tokens: QuickAddToken[] = [];
  const ignoredTokens: QuickAddToken[] = [];

  const labelsByName = new Map<string, string>();
  for (const label of labels) {
    const key = normalizeLabelName(label.name);
    if (!labelsByName.has(key)) labelsByName.set(key, label.id);
  }

  const labelIds: string[] = [];
  for (const match of text.matchAll(LABEL_TAG)) {
    const labelId = labelsByName.get(normalizeLabelName(match[2]));
    if (!labelId) continue; // unknown tag: stays in the title, nothing is created
    const id = `label:${labelId}`;
    const start = (match.index ?? 0) + match[1].length;
    const token: QuickAddToken = {
      id,
      kind: "label",
      start,
      end: start + 1 + match[2].length,
      text: `#${match[2]}`,
      labelId,
    };
    if (ignored.has(id)) {
      ignoredTokens.push(token);
      continue;
    }
    tokens.push(token);
    if (!labelIds.includes(labelId)) labelIds.push(labelId);
  }

  // Only the last priority tag counts; earlier ones stay as plain text.
  let priority: Priority | null = null;
  const last = [...text.matchAll(PRIORITY_TAG)].at(-1);
  if (last) {
    const start = (last.index ?? 0) + last[1].length;
    const word = last[2].toLowerCase();
    const token: QuickAddToken = {
      id: "priority",
      kind: "priority",
      start,
      end: start + 1 + word.length,
      text: `!${last[2]}`,
      priority: PRIORITY_BY_WORD[word],
    };
    if (ignored.has(token.id)) {
      ignoredTokens.push(token);
    } else {
      priority = token.priority;
      tokens.push(token);
    }
  }

  // Blank out every #tag (known or not) and the priority tag before looking
  // for dates, so "#monday-standup" can't produce a date. Replacing with
  // spaces of the same length keeps every index valid.
  const blank = (match: string) => " ".repeat(match.length);
  const masked = text.replace(LABEL_TAG, blank).replace(PRIORITY_TAG, blank);

  let dueDate: string | null = null;
  let allDay = false;
  for (const candidate of findDateCandidates(masked, now)) {
    const tokenText = text.slice(candidate.start, candidate.end);
    const id = `date:${tokenText.trim().toLowerCase()}`;
    const date = resolveDate(candidate.result, now);
    const candidateAllDay = !candidate.result.start.isCertain("hour");
    const token: QuickAddToken = {
      id,
      kind: "date",
      start: candidate.start,
      end: candidate.end,
      text: tokenText,
      dueDate: (candidateAllDay ? startOfDay(date) : new Date(date.setSeconds(0, 0))).toISOString(),
      allDay: candidateAllDay,
    };
    if (ignored.has(id)) {
      ignoredTokens.push(token);
      continue; // ignored: try the next date in the text
    }
    dueDate = token.dueDate;
    allDay = token.allDay;
    tokens.push(token);
    break; // only the first date counts; later ones stay in the title
  }

  tokens.sort((a, b) => a.start - b.start);
  ignoredTokens.sort((a, b) => a.start - b.start);

  let title = "";
  let cursor = 0;
  for (const token of tokens) {
    title += text.slice(cursor, token.start) + " ";
    cursor = token.end;
  }
  title = (title + text.slice(cursor)).replace(/\s+/g, " ").trim();

  return { title, dueDate, allDay, labelIds, priority, tokens, ignoredTokens };
}
