/**
 * Fixed palette of 12 curated label colors, generated in OKLCH
 * (L=0.75, C=0.14) spread evenly across the hue wheel so they read as
 * one cohesive family against the app's dark theme instead of an
 * open-ended color picker. Single source of truth: both the Zod schema
 * (`Label.color` in lib/types) and the swatch-picker UI import this
 * array rather than duplicating the hex values.
 */
export const LABEL_COLORS = [
  { name: "Red", hex: "#fa8880" },
  { name: "Orange", hex: "#f68f5f" },
  { name: "Amber", hex: "#e69c3a" },
  { name: "Yellow-green", hex: "#c3af32" },
  { name: "Green", hex: "#7cc36c" },
  { name: "Teal", hex: "#3cc998" },
  { name: "Cyan", hex: "#00c9c1" },
  { name: "Sky", hex: "#00c6d8" },
  { name: "Blue", hex: "#2bbdf5" },
  { name: "Indigo", hex: "#6eb0ff" },
  { name: "Purple", hex: "#a5a0ff" },
  { name: "Magenta", hex: "#da8dde" },
] as const;

export type LabelColorHex = (typeof LABEL_COLORS)[number]["hex"];

/** Tuple form z.enum() needs — derived from LABEL_COLORS, not hand-typed. */
export const LABEL_COLOR_HEXES = LABEL_COLORS.map((c) => c.hex) as [
  LabelColorHex,
  ...LabelColorHex[],
];

export const DEFAULT_LABEL_COLOR: LabelColorHex = LABEL_COLORS[0].hex;
