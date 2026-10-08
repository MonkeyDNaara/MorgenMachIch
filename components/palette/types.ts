import type { LucideIcon } from "lucide-react";

/** One selectable row in the command palette. */
export type PaletteItem = {
  id: string;
  label: string;
  /** Heading the row is listed under (see GROUP_ORDER in CommandPalette). */
  group: string;
  icon: LucideIcon;
  /** Small mono text on the right, e.g. the route a page command goes to. */
  hint?: string;
  /** Runs when the row is chosen; the palette closes first. */
  run: () => void;
};
