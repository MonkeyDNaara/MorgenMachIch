import type { RecurrenceRule } from "@/lib/types";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The Monday on/before `date` — weeks are Mon-Sun throughout the app
 * (see upcomingWeekDays/monthGrid), so weekly interval counting uses
 * the same week boundary rather than a rolling 7-day window from the
 * series' start date. */
function mondayOf(date: Date): Date {
  const offset = (date.getDay() + 6) % 7; // Mon=0..Sun=6
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** True if `date` matches the monthly-specific part of the rule
 * (day-of-month or nth-weekday), ignoring the interval — that's checked
 * separately in matchesRule so both monthly modes share one interval
 * check. */
function matchesMonthlyPattern(date: Date, rule: RecurrenceRule): boolean {
  if (rule.monthlyMode === "dayOfMonth") {
    return date.getDate() === rule.dayOfMonth;
  }
  if (rule.monthlyMode === "nthWeekday" && rule.nthWeekday) {
    if (date.getDay() !== rule.nthWeekday.weekday) return false;
    if (rule.nthWeekday.n === -1) {
      // "Last": true if adding a week rolls into next month.
      const nextWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
      return nextWeek.getMonth() !== date.getMonth();
    }
    const occurrence = Math.floor((date.getDate() - 1) / 7) + 1; // 1st..5th occurrence of this weekday
    return occurrence === rule.nthWeekday.n;
  }
  return false;
}

/**
 * True if `date` is an occurrence of `rule` anchored at `startDate` (day
 * zero of the series — the interval count for every frequency is
 * relative to it, so "every 2 weeks" or "every 3 months" lines up with
 * when the series actually started).
 */
function matchesRule(date: Date, startDate: Date, rule: RecurrenceRule): boolean {
  if (rule.frequency === "daily") {
    return daysBetween(startOfDay(startDate), date) % rule.interval === 0;
  }
  if (rule.frequency === "weekly") {
    if (!rule.daysOfWeek?.includes(date.getDay())) return false;
    const weeksSinceStart = Math.round(daysBetween(mondayOf(startDate), mondayOf(date)) / 7);
    return weeksSinceStart % rule.interval === 0;
  }
  // monthly
  if (!matchesMonthlyPattern(date, rule)) return false;
  const monthsSinceStart =
    (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth());
  return monthsSinceStart % rule.interval === 0;
}

/**
 * Every occurrence date for `rule`, anchored at `startDate`, strictly
 * after `from` and up to (and including) `horizon` — or the rule's own
 * `endDate`, whichever is sooner.
 *
 * Walks day by day rather than computing a closed-form "next date" —
 * the horizon is only ~60 days (see lib/db/occurrences.ts), so a plain
 * loop is far simpler to get right across three different frequencies
 * than interval arithmetic, and just as fast at this scale.
 */
export function occurrencesBetween(rule: RecurrenceRule, startDate: Date, from: Date, horizon: Date): Date[] {
  const cutoff = rule.endDate ? startOfDay(new Date(rule.endDate)) : null;
  const effectiveHorizon = cutoff && cutoff < horizon ? cutoff : horizon;
  const fromDay = startOfDay(from);

  const results: Date[] = [];
  const cursor = startOfDay(startDate);
  while (cursor <= effectiveHorizon) {
    if (cursor > fromDay && matchesRule(cursor, startDate, rule)) {
      results.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

/**
 * Sensible defaults for the monthly-mode fields when a rule first
 * switches to "monthly", derived from the task's due date: dayOfMonth
 * defaults to that date's day-of-month, nthWeekday to which occurrence
 * of that weekday it is (defaulting to "Last" if it happens to be the
 * final one that month) — the same heuristic calendar apps use.
 */
export function computeMonthlyDefaults(dueDateIso: string): {
  dayOfMonth: number;
  nthWeekday: { n: number; weekday: number };
} {
  const date = new Date(dueDateIso);
  const dayOfMonth = date.getDate();
  const weekday = date.getDay();
  const occurrence = Math.floor((dayOfMonth - 1) / 7) + 1;
  const nextWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
  const n = nextWeek.getMonth() !== date.getMonth() ? -1 : occurrence;
  return { dayOfMonth, nthWeekday: { n, weekday } };
}
