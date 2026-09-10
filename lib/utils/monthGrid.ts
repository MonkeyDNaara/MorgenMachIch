export type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
};

function isSameCalendarDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/**
 * Builds the /calendar month grid (#145): every day from the Monday
 * on/before the 1st through the Sunday on/after the month's last day,
 * so the grid always ends on a full week — weeks are Mon-Sun, matching
 * upcomingWeekDays' week boundary. Row count is whatever the month
 * actually needs (4-6 weeks), not padded to a fixed 6.
 *
 * Built from local year/month/day components (never UTC), same
 * convention as upcomingWeekDays/isSameLocalDay.
 */
export function getMonthGrid(year: number, month: number, today: Date = new Date()): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const leadingDays = (firstOfMonth.getDay() + 6) % 7; // Mon=0..Sun=6
  const trailingDays = 6 - ((lastOfMonth.getDay() + 6) % 7);
  const totalDays = leadingDays + lastOfMonth.getDate() + trailingDays;

  const gridStart = new Date(year, month, 1 - leadingDays);

  const days: CalendarDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    days.push({
      date,
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameCalendarDate(date, today),
    });
  }
  return days;
}
