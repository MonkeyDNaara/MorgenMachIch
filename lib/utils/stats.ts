import type { Task } from "@/lib/types";
import { APP_LOCALE } from "@/lib/constants/locale";
import { toLocalDateKey } from "@/lib/utils/planDateOptions";

/**
 * Pure numbers behind /stats and the streak badge (Stats & Streaks epic,
 * #214). Everything is derived from `completedAt` on done tasks — there is
 * no separate completion log (see PLANNING.md), so reopening a task or
 * deleting it removes it from the stats. Skipped tasks never count;
 * recurring occurrences count like any other task.
 *
 * All day boundaries are *local* calendar days, built from local
 * year/month/day parts so they stay right across DST changes. `now` is
 * always passed in, never read here, so every function is testable.
 */

type CompletedTask = Pick<Task, "status" | "completedAt">;

/** A completed task as the stats see it: done with a completion time. */
function completedAtOf(task: CompletedTask): Date | null {
  return task.status === "done" && task.completedAt ? new Date(task.completedAt) : null;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Monday of the local week containing `date`. */
export function startOfLocalWeek(date: Date): Date {
  return addLocalDays(startOfLocalDay(date), -((date.getDay() + 6) % 7));
}

/** Completions per local day, keyed "YYYY-MM-DD". */
export function completionsByDay(tasks: CompletedTask[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const task of tasks) {
    const completedAt = completedAtOf(task);
    if (!completedAt) continue;
    const key = toLocalDateKey(completedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return byDay;
}

export type StreakSummary = {
  /** Consecutive days with a completion, ending today — or yesterday while
   * today has none yet, because today isn't over. */
  current: number;
  best: number;
  completedToday: boolean;
  /** Streak alive only thanks to yesterday: complete something today to keep it. */
  atRisk: boolean;
};

export function streakSummary(byDay: Map<string, number>, now: Date): StreakSummary {
  const today = startOfLocalDay(now);
  const has = (day: Date) => (byDay.get(toLocalDateKey(day)) ?? 0) > 0;
  const completedToday = has(today);

  let current = 0;
  let day = completedToday ? today : addLocalDays(today, -1);
  while (has(day)) {
    current++;
    day = addLocalDays(day, -1);
  }

  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of [...byDay.keys()].sort()) {
    if ((byDay.get(key) ?? 0) === 0) continue;
    const [year, month, date] = key.split("-").map(Number);
    const thisDay = new Date(year, month - 1, date);
    const consecutive = previous !== null && toLocalDateKey(addLocalDays(previous, 1)) === key;
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    previous = thisDay;
  }

  return {
    current,
    best: Math.max(best, current),
    completedToday,
    atRisk: !completedToday && current > 0,
  };
}

/** Completions today, this week (Monday-based) and this calendar month. */
export function periodTotals(byDay: Map<string, number>, now: Date) {
  const todayKey = toLocalDateKey(now);
  const weekStartKey = toLocalDateKey(startOfLocalWeek(now));
  const monthPrefix = todayKey.slice(0, 7);
  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;
  for (const [key, count] of byDay) {
    if (key > todayKey) continue; // a completion stamped in the future (clock change) is ignored
    if (key === todayKey) today += count;
    if (key >= weekStartKey) thisWeek += count;
    if (key.startsWith(monthPrefix)) thisMonth += count;
  }
  return { today, thisWeek, thisMonth };
}

export type DayCount = { key: string; date: Date; count: number };

/** One entry per day for the last `days` days, oldest first, ending today. */
export function dailySeries(byDay: Map<string, number>, now: Date, days: number): DayCount[] {
  const today = startOfLocalDay(now);
  const series: DayCount[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addLocalDays(today, -offset);
    const key = toLocalDateKey(date);
    series.push({ key, date, count: byDay.get(key) ?? 0 });
  }
  return series;
}

/**
 * Completions per week for the last `weeks` weeks, oldest first, ending
 * with the current week. Each entry's `date`/`key` is that week's Monday.
 * Used for the bar chart's "All" view (#217), where daily bars would be
 * too thin to read.
 */
export function weeklySeries(byDay: Map<string, number>, now: Date, weeks: number): DayCount[] {
  const thisMonday = startOfLocalWeek(now);
  const series: DayCount[] = [];
  for (let offset = weeks - 1; offset >= 0; offset--) {
    const monday = addLocalDays(thisMonday, -7 * offset);
    let count = 0;
    for (let day = 0; day < 7; day++) {
      count += byDay.get(toLocalDateKey(addLocalDays(monday, day))) ?? 0;
    }
    series.push({ key: toLocalDateKey(monday), date: monday, count });
  }
  return series;
}

export type HeatmapCell = DayCount & {
  /** 0 = nothing, 1–4 = quarters of the busiest day in the grid. */
  level: 0 | 1 | 2 | 3 | 4;
  /** After today (the rest of the current week) — drawn empty. */
  future: boolean;
};

export type Heatmap = {
  /** Columns of 7 cells, Monday first; the last column is the current week. */
  weeks: HeatmapCell[][];
  /** Where a month label goes: the first column whose Monday is in a new month. */
  months: { weekIndex: number; label: string }[];
  total: number;
  max: number;
};

/** GitHub-style year grid: the last `weekCount` weeks up to this week. */
export function yearHeatmap(byDay: Map<string, number>, now: Date, weekCount = 53): Heatmap {
  const today = startOfLocalDay(now);
  const firstMonday = addLocalDays(startOfLocalWeek(today), -7 * (weekCount - 1));

  const raw: DayCount[][] = [];
  let max = 0;
  let total = 0;
  for (let w = 0; w < weekCount; w++) {
    const week: DayCount[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addLocalDays(firstMonday, w * 7 + d);
      const key = toLocalDateKey(date);
      const count = date > today ? 0 : (byDay.get(key) ?? 0);
      max = Math.max(max, count);
      total += count;
      week.push({ key, date, count });
    }
    raw.push(week);
  }

  const weeks = raw.map((week) =>
    week.map((cell) => ({
      ...cell,
      level: (cell.count === 0
        ? 0
        : Math.min(4, Math.ceil((cell.count / max) * 4))) as HeatmapCell["level"],
      future: cell.date > today,
    })),
  );

  const months: Heatmap["months"] = [];
  weeks.forEach((week, weekIndex) => {
    const month = week[0].date.getMonth();
    const previous = weekIndex > 0 ? weeks[weekIndex - 1][0].date.getMonth() : null;
    if (month !== previous) {
      months.push({
        weekIndex,
        label: week[0].date.toLocaleDateString(APP_LOCALE, { month: "short" }),
      });
    }
  });
  // A label on the very first column is usually a partial month squeezed
  // against the next one; drop it when the next label follows too closely.
  if (months.length > 1 && months[1].weekIndex - months[0].weekIndex < 3) months.shift();

  return { weeks, months, total, max };
}

export type StatsPeriod = "7d" | "30d" | "all";

/** First local day included in a period, or null for all time. */
export function periodStart(period: StatsPeriod, now: Date): Date | null {
  if (period === "all") return null;
  return addLocalDays(startOfLocalDay(now), period === "7d" ? -6 : -29);
}

function completedInPeriod<T extends CompletedTask>(tasks: T[], since: Date | null): T[] {
  return tasks.filter((task) => {
    const completedAt = completedAtOf(task);
    return completedAt !== null && (since === null || completedAt >= since);
  });
}

/**
 * Completions per label in the period, busiest first. A task with several
 * labels counts once for each; tasks without a label share the `null`
 * bucket. Ties keep a stable order (label id).
 */
export function completionsByLabel(
  tasks: Pick<Task, "status" | "completedAt" | "labelIds">[],
  since: Date | null,
): { labelId: string | null; count: number }[] {
  const counts = new Map<string | null, number>();
  for (const task of completedInPeriod(tasks, since)) {
    const keys = task.labelIds.length > 0 ? task.labelIds : [null];
    for (const key of new Set(keys)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([labelId, count]) => ({ labelId, count }))
    .sort((a, b) => b.count - a.count || String(a.labelId).localeCompare(String(b.labelId)));
}

/**
 * Of the tasks with a due date completed in the period, how many were done
 * on or before their due *day* (a task due at 10:00 and done at 18:00 the
 * same day is on time). `rate` is null when there is nothing to measure.
 */
export function onTimeRate(
  tasks: Pick<Task, "status" | "completedAt" | "dueDate">[],
  since: Date | null,
): { onTime: number; total: number; rate: number | null } {
  let onTime = 0;
  let total = 0;
  for (const task of completedInPeriod(tasks, since)) {
    if (!task.dueDate) continue;
    total++;
    const doneDay = toLocalDateKey(new Date(task.completedAt as string));
    const dueDay = toLocalDateKey(new Date(task.dueDate));
    if (doneDay <= dueDay) onTime++;
  }
  return { onTime, total, rate: total === 0 ? null : onTime / total };
}
