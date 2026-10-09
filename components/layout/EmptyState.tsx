import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export type EmptyCopy = {
  title: string;
  hint?: string;
  icon?: LucideIcon;
};

/**
 * Designed empty state (#243): a sunken icon tile, one short heading and
 * one helpful line — never just grey text. `compact` is for narrow
 * columns (the Recurring and Backlog columns on /tasks).
 */
export default function EmptyState({
  title,
  hint,
  icon: Icon = Sparkles,
  compact = false,
}: EmptyCopy & { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? "gap-2 px-2 py-6" : "gap-3 px-4 py-12"}`}
    >
      <span
        aria-hidden
        className={`flex items-center justify-center rounded-xl surface-sunken text-base-content/50 ${
          compact ? "size-9" : "size-11"
        }`}
      >
        <Icon size={compact ? 16 : 20} strokeWidth={1.8} />
      </span>
      <p className={`font-medium ${compact ? "text-sm" : "text-body"}`}>{title}</p>
      {hint && (
        <p className={`max-w-xs text-base-content/50 ${compact ? "text-xs" : "text-sm"}`}>{hint}</p>
      )}
    </div>
  );
}
