/**
 * Dexie/IndexedDB error names that mean "the browser's storage itself
 * isn't usable" rather than "our code has a bug" — blocked or missing
 * IndexedDB (private windows, strict privacy settings, old browsers),
 * a full quota, or a connection that was closed under us (#177).
 */
const STORAGE_ERROR_NAMES = new Set([
  "OpenFailedError",
  "DatabaseClosedError",
  "MissingAPIError",
  "QuotaExceededError",
  "SecurityError",
  "InvalidStateError",
  "VersionError",
]);

/**
 * True if `error` looks like a browser-storage failure, so the error
 * page can show a targeted hint instead of a generic message. Pure and
 * defensive: anything that isn't an Error-like object is "not storage".
 */
export function isStorageError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (typeof name === "string" && STORAGE_ERROR_NAMES.has(name)) return true;
  return typeof message === "string" && /indexeddb/i.test(message);
}
