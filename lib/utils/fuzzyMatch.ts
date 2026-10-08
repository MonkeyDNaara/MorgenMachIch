/**
 * Fuzzy matching for the command palette (#194): a query matches a text
 * when its letters appear in the text in order ("tdy" → "Today"), and
 * the best-scoring alignment decides how well. Pure and UI-free so the
 * ranking can be checked on its own.
 */

export type FuzzyMatch = {
  /** Higher is better; only comparable between matches for the same query. */
  score: number;
  /** Positions in the original text of the matched characters, ascending —
   * used to highlight them in the result list. */
  indices: number[];
};

// Scoring weights. A consecutive run and a word-start hit are what make a
// match feel "intended" ("tsk" in "Tasks"), so they outweigh the small
// penalties for skipped letters and a late start.
const MATCH = 1;
const CONSECUTIVE_BONUS = 5;
const WORD_START_BONUS = 4;
const FIRST_CHAR_BONUS = 3;
const GAP_PENALTY = 0.5;
const LEADING_PENALTY = 0.1;
const LENGTH_PENALTY = 0.01;

function isAlphanumeric(char: string): boolean {
  return /[\p{L}\p{N}]/u.test(char);
}

/** Start of the text, after a non-alphanumeric char, or a lower→UPPER camelCase step. */
function isWordStart(text: string, i: number): boolean {
  if (i === 0) return true;
  const prev = text[i - 1];
  if (!isAlphanumeric(prev)) return true;
  const char = text[i];
  return prev === prev.toLowerCase() && char !== char.toLowerCase();
}

/**
 * Matches `query` against `text`. Returns null when the query's letters
 * are not found in order. Case-insensitive; whitespace in the query is
 * ignored; an empty query matches everything with score 0.
 *
 * Finds the *best* alignment with a small dynamic program (O(text × query))
 * instead of taking the first greedy match, so "tsk" lands on the
 * "T…sk" of "Tasks" rather than on scattered letters. Consecutive
 * letters, word starts and a prefix score higher; skipped letters and
 * longer texts score slightly lower.
 */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const q = Array.from(query.replace(/\s+/g, "").toLowerCase());
  if (q.length === 0) return { score: 0, indices: [] };

  const n = text.length;
  const m = q.length;
  if (m > n) return null;
  const lower = Array.from(text, (char) => char.toLowerCase());

  // Cheap rejection before the DP: are the letters there, in order, at all?
  let probe = 0;
  for (let i = 0; i < n && probe < m; i++) if (lower[i] === q[probe]) probe++;
  if (probe < m) return null;

  // best[j][i]: best score with q[j] matched at text[i] (-Infinity = impossible).
  // from[j][i]: the text position of q[j-1] in that best alignment.
  const best: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(-Infinity));
  const from: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(-1));

  for (let j = 0; j < m; j++) {
    // Running max of best[j-1][k] + GAP_PENALTY * k over k <= i-2, so the
    // "skipped letters" case is O(1) per cell: score - GAP * (i - k - 1).
    let gapBest = -Infinity;
    let gapBestIndex = -1;

    for (let i = j; i < n; i++) {
      if (j > 0 && i >= 2 && best[j - 1][i - 2] > -Infinity) {
        const candidate = best[j - 1][i - 2] + GAP_PENALTY * (i - 2);
        if (candidate > gapBest) {
          gapBest = candidate;
          gapBestIndex = i - 2;
        }
      }
      if (lower[i] !== q[j]) continue;

      let score = MATCH;
      if (isWordStart(text, i)) score += WORD_START_BONUS;
      if (i === 0) score += FIRST_CHAR_BONUS;

      if (j === 0) {
        best[j][i] = score - LEADING_PENALTY * i;
        continue;
      }

      let bestPrev = -Infinity;
      let prevIndex = -1;
      if (best[j - 1][i - 1] > -Infinity) {
        bestPrev = best[j - 1][i - 1] + CONSECUTIVE_BONUS;
        prevIndex = i - 1;
      }
      if (gapBest > -Infinity) {
        const viaGap = gapBest - GAP_PENALTY * (i - 1);
        if (viaGap > bestPrev) {
          bestPrev = viaGap;
          prevIndex = gapBestIndex;
        }
      }
      if (prevIndex === -1) continue;
      best[j][i] = score + bestPrev;
      from[j][i] = prevIndex;
    }
  }

  let end = -1;
  let endScore = -Infinity;
  for (let i = 0; i < n; i++) {
    if (best[m - 1][i] > endScore) {
      endScore = best[m - 1][i];
      end = i;
    }
  }
  if (end === -1) return null;

  const indices: number[] = new Array<number>(m);
  let at = end;
  for (let j = m - 1; j >= 0; j--) {
    indices[j] = at;
    at = from[j][at];
  }

  return { score: endScore - LENGTH_PENALTY * n, indices };
}

export type RankedItem<T> = FuzzyMatch & { item: T };

/**
 * Filters `items` to those whose text matches `query` and sorts them
 * best-first; equal scores keep their original order (stable), so a
 * pre-sorted list stays predictable. An empty query returns every item
 * in its original order with no highlights.
 */
export function rankByQuery<T>(
  items: readonly T[],
  query: string,
  getText: (item: T) => string,
): RankedItem<T>[] {
  const ranked: { entry: RankedItem<T>; order: number }[] = [];
  items.forEach((item, order) => {
    const match = fuzzyMatch(query, getText(item));
    if (match) ranked.push({ entry: { item, ...match }, order });
  });
  return ranked
    .sort((a, b) => b.entry.score - a.entry.score || a.order - b.order)
    .map(({ entry }) => entry);
}
