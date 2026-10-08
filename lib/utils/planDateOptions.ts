import { upcomingWeekDays } from "@/lib/utils/upcomingWeekDays";
import { APP_LOCALE } from "@/lib/constants/locale";

export type PlanDateOption = {
  /** Stable React key — the local date as YYYY-MM-DD. */
  key: string;
  label: string;
  date: Date;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Local YYYY-MM-DD — the format `<input type="date">` uses. */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The quick choices for "Plan for…" on a backlog task (#183): Today,
 * Tomorrow, then every remaining day up to this week's Sunday (reusing
 * upcomingWeekDays so "the rest of the week" means the same thing as in
 * the week-ahead strip). On Saturday that is just Today + Tomorrow, on
 * Sunday only Today — "Pick date" covers anything further out. Weekday
 * names come from APP_LOCALE like every other date in the app (#191).
 */
export function planDateOptions(from: Date = new Date()): PlanDateOption[] {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const [tomorrow, ...restOfWeek] = upcomingWeekDays(from);

  const options: PlanDateOption[] = [{ key: toLocalDateKey(today), label: "Today", date: today }];
  if (tomorrow) {
    options.push({ key: toLocalDateKey(tomorrow), label: "Tomorrow", date: tomorrow });
  }
  for (const day of restOfWeek) {
    options.push({
      key: toLocalDateKey(day),
      label: day.toLocaleDateString(APP_LOCALE, { weekday: "long" }),
      date: day,
    });
  }
  return options;
}

/**
 * Stored due date for a planned task: local midnight of that day, as
 * ISO — the same value buildDueDateIso produces for an all-day task, so
 * a planned task is indistinguishable from one given a date in the
 * drawer. Takes a date key so the native date input can feed it directly.
 */
export function planDueDateIso(dateKey: string): string {
  return new Date(`${dateKey}T00:00`).toISOString();
}
