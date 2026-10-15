import type * as chrono from "chrono-node";
import { RecurrenceRuleSchema, type Label, type Priority, type RecurrenceRule } from "@/lib/types";
import { occurrencesBetween } from "@/lib/domain/recurrence";
import { parseDateOnly } from "@/lib/date/parseDateOnly";
import { canBeLabelTag, normalizeLabelName, tagToLabelName } from "@/lib/domain/labelNames";
import { findRecurrencePhrase, type RecurrencePhrase } from "@/lib/utils/parseRecurrence";
import { findDateCandidates, isDated, resolveDate, startOfDay } from "@/lib/date/parseDate";

/**
 * Natural-language quick-add (#202): turns free text such as
 * "Call mom fri 3pm #family !high" into task fields. Pure and UI-free —
 * the clock and the label list come in as arguments — so every entry point
 * (palette, quick-add bars, task drawer) and a future API can share it.
 *
 * Understands three kinds of tokens:
 * - a date/time, English (en-GB, day before month) or German, via chrono-node
 * - `#label` for existing labels; unknown tags stay in the title, or — with
 *   `newLabels: true` (#283) — become "new label" tokens the caller creates
 * - `!priority`: !high/!medium/!med/!low or !1/!2/!3 (1 = high)
 * - a recurrence ("every mon 7am", "jeden 1. bis 31.12."), only when the
 *   caller opts in with `recurrence: true` (#274) — see parseRecurrence.ts
 *
 * Every matched token is reported with its position so the UI can
 * highlight it, and any token can be ignored by passing its id back in
 * `ignored` — its text then stays in the title.
 */

export type QuickAddTokenKind = "date" | "label" | "newLabel" | "priority" | "recurrence";

/**
 * What a date token means: the due date of a task, or — next to a
 * recurrence — the series' start (and time of day) or its end date.
 */
export type QuickAddDateRole = "due" | "start" | "end";

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
  | (QuickAddTokenBase & {
      kind: "date";
      role: QuickAddDateRole;
      /** The date this token names (for "start" with only a time: today at that time). */
      dueDate: string;
      /** No time given. */
      allDay: boolean;
      /** Only a time, no day ("7am", "18 Uhr") — for a start token this means
       * "time of day", for a due token the date was filled in. */
      timeOnly: boolean;
    })
  | (QuickAddTokenBase & { kind: "recurrence"; recurrence: RecurrenceRule })
  | (QuickAddTokenBase & { kind: "label"; labelId: string })
  | (QuickAddTokenBase & {
      kind: "newLabel";
      /** Name the label will get ("Deep work" for `#deep-work`). */
      name: string;
      /** Position among the distinct new labels in this text (0, 1, …) —
       * which unused palette color it will get (see pickLabelColors). */
      index: number;
    })
  | (QuickAddTokenBase & { kind: "priority"; priority: Priority });

export type QuickAddResult = {
  /** Input without the matched tokens, whitespace collapsed. May be empty. */
  title: string;
  /** ISO datetime, or null when no date was found. With a recurrence this
   * is the series' first occurrence (its `startDate`). */
  dueDate: string | null;
  /** True when the date has no explicit time ("fri", "morgen"). */
  allDay: boolean;
  labelIds: string[];
  /** Names of labels to create for unknown `#tags` (#283), distinct, in
   * text order; empty unless `newLabels: true`. */
  newLabels: string[];
  /** null = no priority token, so the caller keeps its own default. */
  priority: Priority | null;
  /** The complete rule (days/monthly mode filled in, `endDate` as a local
   * "YYYY-MM-DD" like the rule builder) when the text describes a series;
   * null otherwise. Only with `recurrence: true`. */
  recurrence: RecurrenceRule | null;
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
  /** Look for recurrence phrases (#274). Off by default, so entry points
   * that can't create a series yet keep the plain task behaviour. */
  recurrence?: boolean;
  /** Report unknown `#tags` (with a letter) as "new label" tokens (#283). */
  newLabels?: boolean;
};

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

// --- recurrence ---------------------------------------------------------------

// Next to a recurrence, "until 31 Dec" / "bis 31.12." is the end date and
// "from 1.11." / "ab Montag" the start. Checked on the text before the date.
const END_PREPOSITION =
  /(?:^|\s)((?:until|till|thru|through|ending|bis(?:\s+(?:zum|zur|einschließlich))?)\s+)$/i;
const START_PREPOSITION =
  /(?:^|\s)((?:from|starting(?:\s+(?:on|from))?|beginning(?:\s+on)?|ab(?:\s+dem)?|beginnend(?:\s+(?:am|mit))?)\s+)$/i;

// Replaced by "|" before chrono when there is a recurrence: "from 14 Oct" would
// otherwise read as the time "from 14", and "18 Uhr bis 31.12." would merge
// into one range (or, with spaces, one datetime) — start and end should be
// separate tokens (chips). chrono never joins dates across a "|".
const START_END_WORDS =
  /(?<![\p{L}\p{N}])(?:from|starting|beginning|until|till|thru|through|bis)(?![\p{L}\p{N}])(?=\s)/giu;

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function localDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type SeriesStart = { dueDate: string; allDay: boolean };

/**
 * The first occurrence of `rule` on or after `anchorDay` (ignoring the
 * interval: "every 2 weeks on Mon" started on a Wednesday begins next
 * Monday, and that Monday becomes the series' week zero). With a time
 * that has already passed today, the next occurrence instead — the same
 * idea as "3pm" meaning tomorrow when it's 5pm.
 */
function firstOccurrence(
  rule: RecurrenceRule,
  anchorDay: Date,
  time: { hours: number; minutes: number } | null,
  now: Date,
): SeriesStart | null {
  const search: RecurrenceRule = { ...rule, interval: 1, endDate: null };
  const dates = occurrencesBetween(
    search,
    anchorDay,
    addDays(anchorDay, -1),
    addDays(anchorDay, 400),
  );
  const last = rule.endDate ? parseDateOnly(rule.endDate) : null;
  for (const day of dates) {
    if (last && day > last) return null; // the series would end before it starts
    if (!time) return { dueDate: day.toISOString(), allDay: true };
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hours, time.minutes);
    if (at >= now) return { dueDate: at.toISOString(), allDay: false };
  }
  return null;
}

/** Fills what the phrase left open from the start day: "weekly" → that
 * weekday, "monthly" → that day of the month. */
function completeRule(phrase: RecurrencePhrase, anchorDay: Date): RecurrenceRule {
  const rule: RecurrenceRule = { ...phrase.pattern, endDate: null };
  if (rule.frequency === "weekly" && !rule.daysOfWeek?.length)
    rule.daysOfWeek = [anchorDay.getDay()];
  if (rule.frequency === "monthly" && !rule.monthlyMode) {
    rule.monthlyMode = "dayOfMonth";
    rule.dayOfMonth = anchorDay.getDate();
  }
  return rule;
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
  const newLabels: string[] = [];
  const newLabelKeys: string[] = []; // every distinct new tag, ignored or not — fixes the colors
  for (const match of text.matchAll(LABEL_TAG)) {
    const key = normalizeLabelName(match[2]);
    const labelId = labelsByName.get(key);
    if (!labelId) {
      // Unknown tag: stays in the title, unless the caller can create it (#283).
      if (!options.newLabels || !canBeLabelTag(match[2])) continue;
      if (!newLabelKeys.includes(key)) newLabelKeys.push(key);
      const start = (match.index ?? 0) + match[1].length;
      const token: QuickAddToken = {
        id: `newLabel:${key}`,
        kind: "newLabel",
        start,
        end: start + 1 + match[2].length,
        text: `#${match[2]}`,
        name: tagToLabelName(match[2]),
        index: newLabelKeys.indexOf(key),
      };
      if (ignored.has(token.id)) {
        ignoredTokens.push(token);
        continue;
      }
      tokens.push(token);
      if (!newLabels.some((name) => normalizeLabelName(name) === key)) newLabels.push(token.name);
      continue;
    }
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
  let masked = text.replace(LABEL_TAG, blank).replace(PRIORITY_TAG, blank);

  // Recurrence phrase (#274): blanked out before date detection — even when
  // ignored — so "every monday" never also becomes "due Monday".
  const phrase = options.recurrence ? findRecurrencePhrase(masked) : null;
  let recurrenceToken: (QuickAddToken & { kind: "recurrence" }) | null = null;
  if (phrase) {
    const phraseText = text.slice(phrase.start, phrase.end);
    masked = masked.slice(0, phrase.start) + blank(phraseText) + masked.slice(phrase.end);
    recurrenceToken = {
      id: `recurrence:${phraseText.trim().toLowerCase()}`,
      kind: "recurrence",
      start: phrase.start,
      end: phrase.end,
      text: phraseText,
      recurrence: completeRule(phrase, startOfDay(now)), // refined below
    };
    if (ignored.has(recurrenceToken.id)) {
      ignoredTokens.push(recurrenceToken);
      recurrenceToken = null;
    }
  }

  let dueDate: string | null = null;
  let allDay = false;
  let recurrence: RecurrenceRule | null = null;

  if (phrase && recurrenceToken) {
    // Dates next to a recurrence: the first one is the start (day and/or
    // time), one after "until"/"bis" is the end; a range gives both.
    let start: { token: QuickAddToken & { kind: "date" }; result: chrono.ParsedResult } | null =
      null;
    let end: Date | null = null;
    // The words still count as prepositions: they're checked on `text`.
    const dateText = masked.replace(START_END_WORDS, (match) => "|".padEnd(match.length));
    for (const candidate of findDateCandidates(dateText, now)) {
      const before = text.slice(0, candidate.result.index);
      const endPrep = END_PREPOSITION.exec(before);
      const startPrep = START_PREPOSITION.exec(before);
      const role: QuickAddDateRole = endPrep ? "end" : "start";
      if ((role === "end" && end) || (role === "start" && start)) continue; // later ones stay text
      const prepLength = (endPrep ?? startPrep)?.[1].length ?? 0;
      const tokenStart = Math.min(candidate.start, candidate.result.index - prepLength);
      const tokenText = text.slice(tokenStart, candidate.end);
      const id = `date:${tokenText.trim().toLowerCase()}`;
      const date = resolveDate(candidate.result, now);
      const candidateAllDay = !candidate.result.start.isCertain("hour");
      const token: QuickAddToken & { kind: "date" } = {
        id,
        kind: "date",
        role,
        timeOnly: !isDated(candidate.result),
        start: tokenStart,
        end: candidate.end,
        text: tokenText,
        dueDate: (candidateAllDay
          ? startOfDay(date)
          : new Date(date.setSeconds(0, 0))
        ).toISOString(),
        allDay: candidateAllDay,
      };
      if (ignored.has(id)) {
        ignoredTokens.push(token);
        continue;
      }
      tokens.push(token);
      if (role === "end") {
        end = startOfDay(date);
      } else {
        start = { token, result: candidate.result };
        if (candidate.result.end && !end) end = startOfDay(candidate.result.end.date());
      }
    }

    const startResult = start?.result;
    const dated = startResult !== undefined && isDated(startResult);
    const anchorDay = dated ? startOfDay(new Date(start!.token.dueDate)) : startOfDay(now);
    const time = startResult?.start.isCertain("hour")
      ? { hours: startResult.start.get("hour") ?? 0, minutes: startResult.start.get("minute") ?? 0 }
      : null;
    const rule = completeRule(phrase, anchorDay);
    rule.endDate = end ? localDateKey(end) : null;
    const first = RecurrenceRuleSchema.safeParse(rule).success
      ? firstOccurrence(rule, anchorDay, time, now)
      : null;
    if (first) {
      recurrence = rule;
      recurrenceToken.recurrence = rule;
      tokens.push(recurrenceToken);
      dueDate = first.dueDate;
      allDay = first.allDay;
    } else {
      // No valid series (e.g. the start is after the end): drop the date
      // tokens again and keep the text as typed.
      for (let i = tokens.length - 1; i >= 0; i--)
        if (tokens[i].kind === "date") tokens.splice(i, 1);
    }
  } else {
    for (const candidate of findDateCandidates(masked, now)) {
      const tokenText = text.slice(candidate.start, candidate.end);
      const id = `date:${tokenText.trim().toLowerCase()}`;
      const date = resolveDate(candidate.result, now);
      const candidateAllDay = !candidate.result.start.isCertain("hour");
      const token: QuickAddToken = {
        id,
        kind: "date",
        role: "due",
        timeOnly: !isDated(candidate.result),
        start: candidate.start,
        end: candidate.end,
        text: tokenText,
        dueDate: (candidateAllDay
          ? startOfDay(date)
          : new Date(date.setSeconds(0, 0))
        ).toISOString(),
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

  return {
    title,
    dueDate,
    allDay,
    labelIds,
    newLabels,
    priority,
    recurrence,
    tokens,
    ignoredTokens,
  };
}
