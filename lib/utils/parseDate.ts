import * as chrono from "chrono-node";

/**
 * Date detection shared by natural-language quick-add (#202) and the
 * typable DateField (#258): chrono-node with the en-GB parser (day before
 * month) plus German, a small parser for German "12.10.", a filter for
 * matches that are almost always false positives in a task title, and the
 * "a bare weekday that is today means today" rule. Pure — `now` comes in
 * as an argument. Moved out of parseQuickAdd.ts so both share one setup.
 */

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

export function startOfDay(date: Date): Date {
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
export function resolveDate(result: chrono.ParsedResult, now: Date): Date {
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

export type DateCandidate = { start: number; end: number; result: chrono.ParsedResult };

export function findDateCandidates(masked: string, now: Date): DateCandidate[] {
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

/** The text names a day ("fri", "12.10.", "tomorrow"), not just a time. */
export function isDated(result: chrono.ParsedResult): boolean {
  return result.start.isCertain("day") || result.start.isCertain("weekday");
}

/**
 * Reads a whole input as one date for the DateField (#258): "fri",
 * "tomorrow", "next mon", "in 3 weeks", "12.10.", "übermorgen",
 * "16 Oct 2026". Returns local midnight of that day, or null when the text
 * is empty, isn't a date, names only a time ("3pm"), or has words around
 * the date ("call mom fri") — a date field shouldn't silently drop text.
 * A time inside the text ("fri 3pm") is ignored; the field is date-only.
 */
export function parseDateText(text: string, now: Date): Date | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates = findDateCandidates(trimmed, now);
  if (candidates.length !== 1) return null;
  const [{ start, end, result }] = candidates;
  if (start !== 0 || end !== trimmed.length) return null;
  if (!isDated(result)) return null;
  return startOfDay(resolveDate(result, now));
}
