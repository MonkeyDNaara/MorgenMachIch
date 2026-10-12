import { APP_LOCALE } from "@/lib/constants/locale";
import { parseDateOnly } from "@/lib/utils/parseDateOnly";
import { toLocalDateKey } from "@/lib/utils/planDateOptions";

/**
 * Pure helpers for the DateField (#258). Values are local "YYYY-MM-DD"
 * keys — the same format the native date input used — so storage and
 * `buildDueDateIso` don't change. All day math uses local date parts, so
 * DST never shifts a day.
 */

const MS_PER_DAY = 86_400_000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Calendar days from `now`'s day to `date`'s day (negative = past). */
export function dayOffset(date: Date, now: Date): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / MS_PER_DAY);
}

/** "Fri 16 Oct 2026" — APP_LOCALE parts without en-GB's comma after the weekday. */
export function formatDateFieldValue(key: string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .formatToParts(parseDateOnly(key))
    .filter((part) => part.type !== "literal")
    .map((part) => part.value)
    .join(" ");
}

/**
 * Short distance from today for the hint inside the field: "today",
 * "tomorrow", "yesterday", "in 5 days", "4 days ago", then weeks (from 14
 * days) and months (from 60 days).
 */
export function relativeDayLabel(key: string, now: Date): string {
  const days = dayOffset(parseDateOnly(key), now);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  const abs = Math.abs(days);
  const amount =
    abs < 14
      ? `${abs} days`
      : abs < 60
        ? `${Math.floor(abs / 7)} weeks`
        : `${Math.round(abs / 30)} months`;
  return days > 0 ? `in ${amount}` : `${amount} ago`;
}

export type QuickDateOption = {
  id: "today" | "tomorrow" | "weekend" | "next-week";
  label: string;
  key: string;
};

/**
 * The popover's quick picks: Today, Tomorrow, Weekend (this Saturday; next
 * Saturday when it is already Saturday or Sunday) and Next week (Monday of
 * next week — tomorrow on a Sunday).
 */
export function quickDateOptions(now: Date): QuickDateOption[] {
  const today = startOfDay(now);
  const weekday = today.getDay(); // 0 = Sun … 6 = Sat
  const toSaturday = weekday === 6 ? 7 : weekday === 0 ? 6 : 6 - weekday;
  const toMonday = weekday === 0 ? 1 : 8 - weekday;
  return [
    { id: "today", label: "Today", key: toLocalDateKey(today) },
    { id: "tomorrow", label: "Tomorrow", key: toLocalDateKey(addDays(today, 1)) },
    { id: "weekend", label: "Weekend", key: toLocalDateKey(addDays(today, toSaturday)) },
    { id: "next-week", label: "Next week", key: toLocalDateKey(addDays(today, toMonday)) },
  ];
}

/**
 * Keyboard movement in the month grid (WAI-ARIA date picker pattern):
 * ←/→ one day, ↑/↓ one week, Home/End start/end of the (Monday-first)
 * week, PageUp/PageDown one month (the day is clamped, so 31 Jan → 28 Feb).
 * Returns null for any other key.
 */
export function moveDateFocus(key: string, date: Date): Date | null {
  switch (key) {
    case "ArrowLeft":
      return addDays(date, -1);
    case "ArrowRight":
      return addDays(date, 1);
    case "ArrowUp":
      return addDays(date, -7);
    case "ArrowDown":
      return addDays(date, 7);
    case "Home":
      return addDays(date, -((date.getDay() + 6) % 7));
    case "End":
      return addDays(date, 6 - ((date.getDay() + 6) % 7));
    case "PageUp":
    case "PageDown": {
      const step = key === "PageUp" ? -1 : 1;
      const lastDay = new Date(date.getFullYear(), date.getMonth() + step + 1, 0).getDate();
      return new Date(
        date.getFullYear(),
        date.getMonth() + step,
        Math.min(date.getDate(), lastDay),
      );
    }
    default:
      return null;
  }
}
