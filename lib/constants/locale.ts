/**
 * The one locale every date, weekday and time in the app is formatted
 * with (#191). The UI text is English-only, so formatting follows a
 * fixed English locale instead of the browser's language — otherwise a
 * German browser shows "Samstag, 10. Okt." next to "Today".
 *
 * en-GB rather than en-US: day-before-month ("8 Oct") and 24-hour time
 * ("14:30") read naturally for the app's user and match the Monday-first
 * calendar. Fixed locale also means server and client render the same
 * strings, so there is no hydration mismatch from locale differences.
 *
 * Use this for every toLocale*String / Intl call that produces
 * user-visible text; do not pass `undefined` (browser default) or a
 * hardcoded locale string.
 */
export const APP_LOCALE = "en-GB";
