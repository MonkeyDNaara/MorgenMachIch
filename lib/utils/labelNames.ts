import { LABEL_COLOR_HEXES, type LabelColorHex } from "@/lib/constants/labelColors";

/**
 * "Deep work", "deep-work" and "#DeepWork" all become "deepwork": how a
 * `#tag` is matched to a label (#202). Shared by the quick-add parser,
 * the autocomplete and label creation from a tag (#283), so a label
 * created from `#deep-work` matches `#deep-work` again afterwards.
 */
export function normalizeLabelName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}

/** A tag can become a label only if it contains a letter: "#42" or "#2026" stay text. */
export function canBeLabelTag(tag: string): boolean {
  return /\p{L}/u.test(tag);
}

/**
 * The name of a label created from a tag (#283): hyphens/underscores
 * become spaces and only the first letter is capitalised, the rest stays
 * as typed — "family" → "Family", "deep-work" → "Deep work", "DIY" → "DIY".
 */
export function tagToLabelName(tag: string): string {
  const spaced = tag.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Colors for `count` new labels (#283): first the palette swatches no
 * label uses yet, in palette order; once all 12 are taken, rotating
 * through the palette by the total number of labels.
 */
export function pickLabelColors(usedColors: readonly string[], count: number): LabelColorHex[] {
  const used = new Set(usedColors);
  const unused = LABEL_COLOR_HEXES.filter((hex) => !used.has(hex));
  const picked: LabelColorHex[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(
      i < unused.length
        ? unused[i]
        : LABEL_COLOR_HEXES[(usedColors.length + i) % LABEL_COLOR_HEXES.length],
    );
  }
  return picked;
}
