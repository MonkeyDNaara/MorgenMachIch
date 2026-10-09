/**
 * New due date for "→ Morgen" (#239): tomorrow counted from today (not
 * one day after the old due date, so a task five days overdue lands on
 * tomorrow), keeping the time of day. All-day tasks stay at local
 * midnight. Built from local date parts, so DST changes don't shift the
 * time. Pure, `now` passed in.
 */
export function snoozeToTomorrow(dueIso: string, allDay: boolean, now: Date): string {
  const due = new Date(dueIso);
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    allDay ? 0 : due.getHours(),
    allDay ? 0 : due.getMinutes(),
  ).toISOString();
}
