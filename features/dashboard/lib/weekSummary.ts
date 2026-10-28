import type { Task } from "@/lib/types";
import {
  addLocalDays,
  applyStatsStart,
  completionsByDay,
  onTimeRate,
  periodTotals,
  startOfLocalWeek,
} from "@/features/stats/lib/stats";
import { toLocalDateKey } from "@/lib/date/planDateOptions";
import { APP_LOCALE } from "@/lib/constants/locale";

export type WeekDay = {
  date: Date;
  /** Completions that day; null for days still to come. */
  count: number | null;
};

export type WeekSummary = {
  /** Monday to Sunday of the current local week. */
  days: WeekDay[];
  /** Index of today in `days` (0 = Monday). */
  todayIndex: number;
  /** Completed this week — the same number as the This week card on /stats. */
  done: number;
  /** On-time rate over Monday until now (see onTimeRate). */
  onTime: { onTime: number; total: number; rate: number | null };
  /** Completed last week from Monday to the same weekday as today. */
  lastWeek: number;
};

/**
 * The dashboard's This week card (#425), built on the /stats helpers so the
 * numbers agree: the stats start date is applied first, completions count
 * on the local day of `completedAt`, weeks start on Monday (en-GB). The
 * comparison uses the same span of last week, so a Wednesday is never
 * compared with a whole week. Pure, `now` passed in.
 */
export function weekSummary(
  tasks: readonly Task[],
  now: Date,
  statsSince: string | null,
): WeekSummary {
  const counted = applyStatsStart([...tasks], statsSince);
  const byDay = completionsByDay(counted);
  const monday = startOfLocalWeek(now);
  const todayIndex = (now.getDay() + 6) % 7;
  const countOn = (date: Date) => byDay.get(toLocalDateKey(date)) ?? 0;

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(monday, index);
    return { date, count: index <= todayIndex ? countOn(date) : null };
  });

  let lastWeek = 0;
  for (let index = 0; index <= todayIndex; index++) {
    lastWeek += countOn(addLocalDays(monday, index - 7));
  }

  return {
    days,
    todayIndex,
    done: periodTotals(byDay, now).thisWeek,
    onTime: onTimeRate(counted, monday),
    lastWeek,
  };
}

/** Accessible summary of the bars, e.g. "Done per day this week: Mon 3, Tue 0, Wed 5 (today)". */
export function weekBarsLabel(summary: WeekSummary): string {
  const days = summary.days
    .filter((day) => day.count !== null)
    .map((day, index) => {
      const name = day.date.toLocaleDateString(APP_LOCALE, { weekday: "short" });
      return `${name} ${day.count}${index === summary.todayIndex ? " (today)" : ""}`;
    });
  return `Done per day this week: ${days.join(", ")}`;
}

/** "+3 vs. last week", "−2 vs. last week" or "Same as last week"; null when both are 0. */
export function weekComparison(summary: WeekSummary): string | null {
  const delta = summary.done - summary.lastWeek;
  if (summary.done === 0 && summary.lastWeek === 0) return null;
  if (delta === 0) return "Same as last week";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta)} vs. last week`;
}
