import type { LucideIcon } from "lucide-react";
import type { Priority } from "@/lib/types";

/** One selectable row in the command palette. */
export type PaletteItem = {
  id: string;
  /** "task" rows open on Enter and complete on Cmd/Ctrl+Enter (#197). */
  kind: "command" | "task";
  label: string;
  /** Heading the row is listed under (see GROUP_ORDER in CommandPalette). */
  group: string;
  icon: LucideIcon;
  /** Small mono text on the right, e.g. a route or a due date. */
  hint?: string;
  /** Extra words that find this row without being shown (see matchWithKeywords). */
  keywords?: readonly string[];
  /** Priority dot before the label (task rows). */
  priority?: Priority;
  /** Rendered muted and struck through (a completed task). */
  muted?: boolean;
  /** Subtracted from the match score, e.g. so done tasks rank below open ones. */
  rankPenalty?: number;
  /** Always listed, last in its group, regardless of the query ("Add to backlog"). */
  pinned?: boolean;
  /** Runs when the row is chosen; the palette closes first. */
  run: () => void;
  /** Cmd/Ctrl+Enter action that keeps the palette open (toggle a task done). */
  alternate?: { label: string; run: () => void };
};
