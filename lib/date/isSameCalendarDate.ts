/** True if two Dates fall on the same local calendar day — shared by
 * the month grid (#145) and the recurrence engine (#60) instead of each
 * declaring its own copy. */
export function isSameCalendarDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
