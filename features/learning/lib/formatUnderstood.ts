import { APP_LOCALE } from "@/lib/constants/locale";

/**
 * "12 Nov": the day a topic was understood, in Europe/Berlin whatever the device's zone, so the
 * card reads the same everywhere (and the tests don't depend on the machine's TZ). The app has
 * one user in one zone; `settings.timeZone` could replace the constant later.
 */
const DAY = new Intl.DateTimeFormat(APP_LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Berlin",
});

export function formatUnderstoodOn(iso: string): string {
  return DAY.format(new Date(iso));
}
