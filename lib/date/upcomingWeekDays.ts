/**
 * Local dates for the week-ahead strip's "what's up next" preview (#130)
 * and the "Plan for…" menu (#183): from tomorrow through the coming
 * Sunday — and on the weekend through **next** week's Sunday, so the
 * weekend is when you can plan the week ahead (#282):
 *
 * - Mon–Fri: tomorrow … this Sunday (Friday: Sat + Sun)
 * - Saturday: Sunday + next Monday … Sunday (8 days)
 * - Sunday: next Monday … Sunday (7 days)
 *
 * Built from local year/month/day components (never UTC) so it lines
 * up with isSameLocalDay and the rest of the app's date handling; the
 * Date constructor normalizes day-of-month overflow correctly across
 * month/year boundaries.
 */
export function upcomingWeekDays(from: Date = new Date()): Date[] {
  const dayOfWeek = from.getDay(); // 0=Sun..6=Sat
  const daysUntilSunday = dayOfWeek === 0 ? 7 : dayOfWeek === 6 ? 8 : 7 - dayOfWeek;
  const days: Date[] = [];
  for (let offset = 1; offset <= daysUntilSunday; offset++) {
    days.push(new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset));
  }
  return days;
}
