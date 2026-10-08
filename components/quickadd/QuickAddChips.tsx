import { CalendarClock, Flag, RotateCcw, Tag, X } from "lucide-react";
import type { Label } from "@/lib/types";
import type { QuickAddToken } from "@/lib/utils/parseQuickAdd";
import { tintChipStyle } from "@/lib/ui/colorChip";
import { tokenColor, tokenLabel } from "@/components/quickadd/tokenDisplay";

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

const ICONS = { date: CalendarClock, label: Tag, priority: Flag } as const;
const KIND_NAMES = { date: "due date", label: "label", priority: "priority" } as const;

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
        const Icon = ICONS[token.kind];
        const Action = ignored ? RotateCcw : X;
        return (
          <button
            key={token.id}
            type="button"
            onClick={() => onToggle(token.id)}
            aria-pressed={ignored}
            aria-label={`${ignored ? "Use" : "Ignore"} ${KIND_NAMES[token.kind]} ${text}`}
            title={ignored ? "Use this again" : "Ignore — keep it as text"}
            className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pr-1.5 pl-2.5 text-xs font-medium transition-opacity ${
              ignored ? "line-through opacity-45 hover:opacity-70" : "hover:opacity-90"
            }`}
            style={tintChipStyle(tokenColor(token, labels))}
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
