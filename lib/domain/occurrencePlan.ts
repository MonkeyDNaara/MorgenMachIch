import { TZDate } from "@date-fns/tz";
import { GENERATION_HORIZON_DAYS, occurrencesBetween } from "@/lib/domain/recurrence";
import type { TaskSeries } from "@/lib/types";

export type PlannedOccurrence = {
  /** The local day in the user's time zone, "YYYY-MM-DD" — the generator's dedupe key. */
  occurrenceDate: string;
  /** The due instant (UTC ISO): the series' local time of day on that local day. */
  dueDate: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const dayString = (day: Date) =>
  `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

/**
 * The occurrences a series should have from `now` through the horizon, computed in the
 * user's `timeZone` (#312) — on the server, where the runtime runs in UTC.
 *
 * The recurrence rules (`occurrencesBetween`) work on runtime-local calendar days, so the
 * zone's calendar day is copied into a "floating" runtime-local midnight first, and only
 * the final due time is turned back into a real instant in the zone (`TZDate`, DST-safe:
 * a time in the spring-forward gap moves forward like `Date` does).
 *
 * Same rules as the browser version: no backfill of days before today, nothing before the
 * series' own start day, all-day occurrences are due at local midnight.
 */
export function planOccurrences(
  series: Pick<TaskSeries, "recurrence" | "startDate" | "allDay">,
  timeZone: string,
  now: Date,
  horizonDays = GENERATION_HORIZON_DAYS,
): PlannedOccurrence[] {
  const start = new TZDate(new Date(series.startDate).getTime(), timeZone);
  const local = new TZDate(now.getTime(), timeZone);
  const seriesStartDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  const anchor = seriesStartDay > today ? seriesStartDay : today;
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 1);
  const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + horizonDays);

  const hours = series.allDay ? 0 : start.getHours();
  const minutes = series.allDay ? 0 : start.getMinutes();
  return occurrencesBetween(series.recurrence, seriesStartDay, from, horizon).map((day) => ({
    occurrenceDate: dayString(day),
    dueDate: new Date(
      new TZDate(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hours,
        minutes,
        timeZone,
      ).getTime(),
    ).toISOString(),
  }));
}

/** Today's date in `timeZone`, "YYYY-MM-DD". */
export function localDayIn(timeZone: string, now: Date): string {
  const local = new TZDate(now.getTime(), timeZone);
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}

/** The instant the user's current local day began in `timeZone` ("today or later", #407). */
export function startOfLocalDay(timeZone: string, now: Date): Date {
  const local = new TZDate(now.getTime(), timeZone);
  return new Date(
    new TZDate(local.getFullYear(), local.getMonth(), local.getDate(), 0, 0, timeZone).getTime(),
  );
}
