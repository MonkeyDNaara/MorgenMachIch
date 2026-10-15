import type { CSSProperties } from "react";
import {
  CalendarCheck,
  CalendarClock,
  Clock,
  Flag,
  Plus,
  Repeat,
  RotateCcw,
  Tag,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Label } from "@/lib/types";
import type { QuickAddToken } from "@/features/quick-add/lib/parseQuickAdd";
import { tintChipStyle } from "@/lib/styles/colorChip";
import { tokenColor, tokenLabel } from "@/features/quick-add/lib/tokenDisplay";

type QuickAddChipsProps = {
  id?: string;
  tokens: QuickAddToken[];
  ignoredTokens: QuickAddToken[];
  labels: Label[];
  now: Date;
  onToggle: (id: string) => void;
  /** Wrapper classes; "contents" lets the chips flow into a parent row (#206). */
  className?: string;
};

const ICONS = {
  date: CalendarClock,
  label: Tag,
  newLabel: Plus,
  priority: Flag,
  recurrence: Repeat,
} as const;
const KIND_NAMES = {
  date: "due date",
  label: "label",
  newLabel: "", // the chip text already says "New label: …"
  priority: "priority",
  recurrence: "repeat",
} as const;

/** Next to a recurrence, date chips are the start (clock for a time) or the end (#275). */
function chipIcon(token: QuickAddToken): LucideIcon {
  if (token.kind === "date" && token.role === "end") return CalendarCheck;
  if (token.kind === "date" && token.role === "start" && token.timeOnly) return Clock;
  return ICONS[token.kind];
}

/** A label that doesn't exist yet (#283) gets a dashed outline, no fill. */
function chipStyle(token: QuickAddToken, labels: Label[]): CSSProperties {
  const style = tintChipStyle(tokenColor(token, labels));
  return token.kind === "newLabel"
    ? { ...style, backgroundColor: "transparent", borderStyle: "dashed" }
    : style;
}

function kindName(token: QuickAddToken): string {
  if (token.kind === "date" && token.role === "end") return "end date";
  if (token.kind === "date" && token.role === "start") return "start";
  return KIND_NAMES[token.kind];
}

/**
 * Preview of what a quick-add field will set (#203): one soft-tint chip per
 * matched token, in text order. Clicking a chip ignores that token (its
 * text goes back into the title); an ignored chip stays visible, struck
 * through, and a second click restores it. Nothing renders when there are
 * no tokens.
 */
export default function QuickAddChips({
  id,
  tokens,
  ignoredTokens,
  labels,
  now,
  onToggle,
  className = "mt-2 flex flex-wrap gap-1.5",
}: QuickAddChipsProps) {
  const ignoredIds = new Set(ignoredTokens.map((token) => token.id));
  const all = [...tokens, ...ignoredTokens].sort((a, b) => a.start - b.start);
  if (all.length === 0) return null;

  return (
    <div id={id} className={className}>
      {all.map((token) => {
        const ignored = ignoredIds.has(token.id);
        const text = tokenLabel(token, labels, now);
        const Icon = chipIcon(token);
        const Action = ignored ? RotateCcw : X;
        return (
          <button
            key={`${token.id}@${token.start}`}
            type="button"
            onClick={() => onToggle(token.id)}
            aria-pressed={ignored}
            aria-label={[ignored ? "Use" : "Ignore", kindName(token), text]
              .filter(Boolean)
              .join(" ")}
            title={ignored ? "Use this again" : "Ignore — keep it as text"}
            className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pr-1.5 pl-2.5 text-xs font-medium transition-opacity ${
              ignored ? "line-through opacity-45 hover:opacity-70" : "hover:opacity-90"
            }`}
            style={chipStyle(token, labels)}
          >
            <Icon size={12} aria-hidden />
            {text}
            <Action size={12} aria-hidden className="opacity-60" />
          </button>
        );
      })}
    </div>
  );
}
