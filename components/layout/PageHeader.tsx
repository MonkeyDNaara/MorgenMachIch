import type { ReactNode } from "react";

type PageHeaderProps = {
  /** Small mono line above the title, e.g. "TODAY · 9 OCT 2026". */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** "display" is the big editorial size used only on /today. */
  titleSize?: "display" | "title";
  /** Line below the title: counts, progress, a short hint. */
  meta?: ReactNode;
  /** Right-aligned slot for buttons or a badge. */
  actions?: ReactNode;
  /** Width/padding classes so the header lines up with the page's content column. */
  className?: string;
};

/**
 * Shared page header (#233): eyebrow, title, meta line and an actions
 * slot, used by every route so all pages start the same way. Each page
 * passes its own width classes, matching the container of its content,
 * so the title aligns with the cards below instead of the screen edge.
 */
export default function PageHeader({
  eyebrow,
  title,
  titleSize = "title",
  meta,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 ${className}`}>
      <div className="flex min-w-0 flex-col gap-3">
        {eyebrow && (
          <p className="font-mono text-eyebrow text-base-content/50 uppercase">{eyebrow}</p>
        )}
        <h1 className={titleSize === "display" ? "text-display" : "text-title"}>{title}</h1>
        {meta && <div className="text-sm text-base-content/60">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
