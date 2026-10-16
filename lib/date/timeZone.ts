/**
 * Whether `zone` is an IANA time zone this runtime knows (e.g. "Europe/Berlin").
 * Used to validate the zone the browser sends at first sign-in (#405): the server
 * generates series occurrences in that zone (#312), so a typo must never be stored.
 */
export function isValidTimeZone(zone: string): boolean {
  if (zone.trim() === "") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
