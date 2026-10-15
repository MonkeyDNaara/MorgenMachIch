/**
 * Combines the task drawer's separate date + time inputs into a single
 * ISO datetime string, or null if no date was entered at all.
 *
 * Interpreted as local time — this is a single-timezone personal app with
 * no server, so `new Date("YYYY-MM-DDTHH:mm")` parsing as local time and
 * `toISOString()` converting it to UTC for storage is exactly what we
 * want. All-day tasks (or a date entered with no time) default to local
 * midnight.
 *
 * Reading dueDate back out to decide "is this due today" must convert to
 * *local* date parts again, not UTC — otherwise the day can shift for
 * anyone in a timezone behind UTC. That's for the Today/Calendar views to
 * handle when they're built; this function only builds the stored value.
 */
export function buildDueDateIso(date: string, time: string, allDay: boolean): string | null {
  if (!date) return null;
  const timePart = allDay || !time ? "00:00" : time;
  return new Date(`${date}T${timePart}`).toISOString();
}

/**
 * The reverse of buildDueDateIso: splits a stored ISO datetime back into
 * separate date/time strings for the drawer's inputs, using local time
 * parts (not UTC) so it round-trips correctly with how the value was
 * built. Returns empty strings for a null dueDate (no date entered).
 */
export function splitDueDateIso(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };

  const parsed = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  return { date, time };
}
