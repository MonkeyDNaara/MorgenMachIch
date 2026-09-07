/**
 * Local dates from tomorrow through this week's Sunday, for the
 * week-ahead strip's "what's up next" preview (#130). Empty on Sunday
 * itself — nothing left in the week until Monday resets it back to a
 * full 6 days.
 *
 * Built from local year/month/day components (never UTC) so it lines
 * up with isSameLocalDay and the rest of the app's date handling; the
 * Date constructor normalizes day-of-month overflow correctly across
 * month/year boundaries.
 */
export function upcomingWeekDays(from: Date = new Date()): Date[] {
  const dayOfWeek = from.getDay(); // 0=Sun..6=Sat
  if (dayOfWeek === 0) return [];

  const daysUntilSunday = 7 - dayOfWeek;
  const days: Date[] = [];
  for (let offset = 1; offset <= daysUntilSunday; offset++) {
    days.push(new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset));
  }
  return days;
}
