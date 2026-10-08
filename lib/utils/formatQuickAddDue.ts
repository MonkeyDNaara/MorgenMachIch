import { APP_LOCALE } from "@/lib/constants/locale";
import { formatTime } from "@/lib/utils/formatDueDate";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Label for a parsed due date in the quick-add preview chip (#203):
 * "Today", "Tomorrow", otherwise weekday + date ("Fri 9 Oct"), with the
 * year only when it isn't the current one ("Tue 5 Oct 2027"). Timed dates
 * add the time ("Fri 9 Oct, 15:00"). The weekday is always shown because
 * it is the quickest way to check that "fri" or "nächsten Montag" landed
 * on the day you meant.
 */
export function formatQuickAddDue(iso: string, allDay: boolean, now: Date): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);

  let day: string;
  if (days === 0) day = "Today";
  else if (days === 1) day = "Tomorrow";
  else {
    day = date.toLocaleDateString(APP_LOCALE, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    });
    day = day.replace(",", ""); // en-GB writes "Fri, 9 Oct"
  }

  return allDay ? day : `${day}, ${formatTime(iso)}`;
}
