import { db } from "@/lib/db/db";
import { createTask } from "@/lib/db/tasks";
import type { TaskSeries } from "@/lib/types";
import { occurrencesBetween } from "@/lib/utils/recurrence";
import { dateKey } from "@/lib/utils/groupTasksByDate";

/** How far ahead occurrences are kept generated, from whenever this
 * runs. Regenerated on every app load (see OccurrenceSync) rather than
 * tracked with a persistent cursor — self-healing if the app isn't
 * opened for a while, at the cost of not backfilling occurrences for
 * days that passed while it was closed (deliberate: nobody wants 14
 * "overdue" daily-task instances appearing after a week away). */
export const GENERATION_HORIZON_DAYS = 60;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Tops up every active TaskSeries with generated Task rows through the
 * next GENERATION_HORIZON_DAYS days (#60). Idempotent — each series'
 * existing occurrence dates are checked first, so calling this again
 * with nothing new to generate is a cheap no-op. Safe to call after
 * creating a series (to see results immediately) as well as once per
 * app load.
 *
 * IndexedDB can't index a boolean as a key, so TaskSeries' `active`
 * index (from #21) can't actually be queried via .where() — it would
 * silently return nothing. Series are fetched with toArray() and
 * filtered in memory instead, same as the app already does for
 * `priority` at this data scale (see lib/db/db.ts).
 */
export async function generateOccurrences(now: Date = new Date()): Promise<void> {
  const allSeries = await db.taskSeries.toArray();
  const activeSeries = allSeries.filter((series) => series.active);
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + GENERATION_HORIZON_DAYS);

  for (const series of activeSeries) {
    await topUpSeries(series, now, horizon);
  }
}

async function topUpSeries(series: TaskSeries, now: Date, horizon: Date): Promise<void> {
  const startDate = new Date(series.startDate);
  const today = startOfDay(now);
  const seriesStartDay = startOfDay(startDate);

  // Generate from the later of "today" or the series' own start, so a
  // series starting in the future doesn't get occurrences before it
  // begins, and one starting today/in the past doesn't backfill misses.
  const anchorDay = seriesStartDay > today ? seriesStartDay : today;
  const from = new Date(anchorDay.getFullYear(), anchorDay.getMonth(), anchorDay.getDate() - 1);

  const dates = occurrencesBetween(series.recurrence, seriesStartDay, from, horizon);
  if (dates.length === 0) return;

  const existing = await db.tasks.where("seriesId").equals(series.id).toArray();
  const existingDates = new Set(
    existing.filter((task) => task.dueDate !== null).map((task) => dateKey(new Date(task.dueDate!))),
  );

  const hours = series.allDay ? 0 : startDate.getHours();
  const minutes = series.allDay ? 0 : startDate.getMinutes();

  for (const date of dates) {
    if (existingDates.has(dateKey(date))) continue;

    const dueDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).toISOString();

    await createTask({
      title: series.title,
      ...(series.notes ? { notes: series.notes } : {}),
      priority: series.priority,
      dueDate,
      allDay: series.allDay,
      labelIds: series.labelIds,
      subtasks: series.subtaskTemplate.map((template) => ({
        id: crypto.randomUUID(),
        title: template.title,
        done: false,
      })),
      seriesId: series.id,
    });
  }
}
