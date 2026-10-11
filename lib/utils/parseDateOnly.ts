/**
 * Reads a date-only value such as a series' `endDate` ("2026-12-31", the
 * format of a native date input) as **local** midnight (#279).
 * `new Date("2026-12-31")` would be UTC midnight, which west of UTC is
 * still the previous local day — a series "until 31 Dec" then stopped on
 * 30 Dec there. Anything else (a full ISO datetime from older data) is
 * passed to `new Date` unchanged.
 */
export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
