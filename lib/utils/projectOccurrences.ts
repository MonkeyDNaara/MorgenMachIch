import type { Priority, Task, TaskSeries } from "@/lib/types";
import { occurrenceDueIso, occurrencesBetween } from "@/lib/utils/recurrence";
import { dateKey } from "@/lib/utils/groupTasksByDate";

/** A not-yet-generated occurrence of a recurring series, computed on
 * the fly for display only (#168). Never persisted — when its day
 * enters the generation horizon (see lib/db/occurrences.ts) the real
 * Task row takes its place. */
export type GhostOccurrence = {
  seriesId: string;
  title: string;
  priority: Priority;
  labelIds: string[];
  allDay: boolean;
  /** Same shape/construction as a real occurrence's `dueDate`. */
  dueDate: string;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Projects future occurrences for every active series within the
 * inclusive day range [from, to], skipping anything that already has a
 * real row (#168). The calendar uses this so browsing past the
 * ~60-day generation horizon doesn't make a series look like it ended,
 * without a read-only view ever writing to IndexedDB.
 *
 * - Only active series project (paused series are silent).
 * - Only today or later: past days show real rows only, matching the
 *   generator's "never backfill" rule.
 * - Dedupe runs against *every* real row of the series — skipped and
 *   done included — so a skipped occurrence never reappears as a ghost.
 * - Start date and `endDate` are respected by `occurrencesBetween`.
 *
 * Pure: no DB access, `today` is injected.
 */
export function projectSeriesOccurrences(
  series: TaskSeries[],
  tasks: Task[],
  from: Date,
  to: Date,
  today: Date,
): GhostOccurrence[] {
  const firstDay = startOfDay(from) > startOfDay(today) ? startOfDay(from) : startOfDay(today);
  const lastDay = startOfDay(to);
  if (firstDay > lastDay) return [];

  // occurrencesBetween is strictly *after* `from`, so step back a day
  // to make firstDay itself eligible.
  const dayBeforeFirst = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() - 1);

  const existingBySeries = new Map<string, Set<string>>();
  for (const task of tasks) {
    if (task.seriesId === null || task.dueDate === null) continue;
    const keys = existingBySeries.get(task.seriesId) ?? new Set<string>();
    keys.add(dateKey(new Date(task.dueDate)));
    existingBySeries.set(task.seriesId, keys);
  }

  const ghosts: GhostOccurrence[] = [];
  for (const s of series) {
    if (!s.active) continue;
    const existing = existingBySeries.get(s.id);
    const days = occurrencesBetween(s.recurrence, startOfDay(new Date(s.startDate)), dayBeforeFirst, lastDay);
    for (const day of days) {
      if (existing?.has(dateKey(day))) continue;
      ghosts.push({
        seriesId: s.id,
        title: s.title,
        priority: s.priority,
        labelIds: s.labelIds,
        allDay: s.allDay,
        dueDate: occurrenceDueIso(s, day),
      });
    }
  }
  return ghosts;
}
