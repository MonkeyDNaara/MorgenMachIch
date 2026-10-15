/**
 * Fractional order keys for hand-made list order (#75).
 *
 * A key is a string of base-62 digits read as a fraction after the point
 * ("V" ≈ 0.5, "0V" ≈ 0.008). Between any two keys there is always room
 * for another one, so moving an item changes exactly one row instead of
 * renumbering the whole list — in Dexie today and in Postgres later.
 *
 * The digits are in ASCII order (0-9 < A-Z < a-z), so keys sort with a
 * plain string comparison (`a < b`, Postgres `COLLATE "C"`). Never use
 * `localeCompare` on them: locale collation can put "a" before "B".
 *
 * Valid keys are non-empty, use only these digits and never end in "0"
 * ("V0" would equal "V", and a trailing zero would leave no room below).
 * Keys only grow when items are squeezed into the same gap again and
 * again (about one character per six inserts) — fine for a Backlog.
 */
export const ORDER_KEY_DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const BASE = ORDER_KEY_DIGITS.length;
/** Shape of a valid key; also used by `TaskSchema` so a broken key in a
 * backup is rejected at import instead of corrupting the order. */
export const ORDER_KEY_PATTERN = /^[0-9A-Za-z]*[1-9A-Za-z]$/;

export function isValidOrderKey(key: string): boolean {
  return ORDER_KEY_PATTERN.test(key);
}

/** Plain code-unit comparison for `Array.prototype.sort`. */
export function compareOrderKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Midpoint of two digit strings; `a` may be "" (= 0), `b` null (= 1). */
function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    // Shared prefix (with `a` padded by zeros): keep it, recurse on the rest.
    let n = 0;
    while ((a[n] ?? "0") === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a ? ORDER_KEY_DIGITS.indexOf(a[0]) : 0;
  const digitB = b !== null ? ORDER_KEY_DIGITS.indexOf(b[0]) : BASE;
  if (digitB - digitA > 1) {
    return ORDER_KEY_DIGITS[Math.round((digitA + digitB) / 2)];
  }
  // Neighbouring first digits: take b's first digit if b goes on (b > that),
  // otherwise keep a's first digit and go one level deeper.
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return ORDER_KEY_DIGITS[digitA] + midpoint(a.slice(1), null);
}

/**
 * A key strictly between `a` and `b`; `null` means an open end, so
 * `keyBetween(null, null)` starts a list, `keyBetween(last, null)` appends
 * and `keyBetween(null, first)` prepends. Throws on invalid keys or when
 * `a >= b`.
 */
export function keyBetween(a: string | null, b: string | null): string {
  if (a !== null && !isValidOrderKey(a)) throw new Error(`Invalid order key: "${a}"`);
  if (b !== null && !isValidOrderKey(b)) throw new Error(`Invalid order key: "${b}"`);
  if (a !== null && b !== null && a >= b) {
    throw new Error(`Order keys out of order: "${a}" >= "${b}"`);
  }
  return midpoint(a ?? "", b);
}

/**
 * `n` keys between `a` and `b`, ascending, spread evenly by splitting the
 * gap in halves — used to give a whole list keys at once.
 */
export function keysBetween(a: string | null, b: string | null, n: number): string[] {
  if (n <= 0) return [];
  const middle = keyBetween(a, b);
  const left = Math.floor((n - 1) / 2);
  return [...keysBetween(a, middle, left), middle, ...keysBetween(middle, b, n - 1 - left)];
}
