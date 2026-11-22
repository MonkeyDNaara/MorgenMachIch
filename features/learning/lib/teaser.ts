const MAX_LENGTH = 220;

/**
 * Plain-text teaser for the dashboard row (#468): the first paragraph of the explanation
 * without Markdown marks, shortened. The row clamps it to two lines; this only keeps the
 * DOM small and the screen reader text free of `**` and backticks.
 */
export function teaserOf(explanation: string): string {
  const paragraph =
    explanation
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block !== "" && !/^(#{1,6}\s|```|[-*+]\s|\d+[.)]\s|>)/.test(block)) ?? "";
  const plain = paragraph
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= MAX_LENGTH) return plain;
  const cut = plain.slice(0, MAX_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 120 ? cut.lastIndexOf(" ") : MAX_LENGTH)}…`;
}
