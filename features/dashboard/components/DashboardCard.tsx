import { useId, type ReactNode } from "react";

type DashboardCardProps = {
  /** Eyebrow heading, e.g. "Yesterday". */
  title: string;
  /** Right side of the heading row: a count, a ratio, a small link. */
  meta?: ReactNode;
  /** Where the content comes from, e.g. "improvement agent" or "apple health · 06:58". */
  source?: ReactNode;
  children: ReactNode;
};

/**
 * Shell for every /today dashboard widget (#421): a panel (it groups
 * things, see the depth rule) with a mono eyebrow `h2`, an optional meta
 * slot and an optional source line. Widgets only fill the body.
 */
export default function DashboardCard({ title, meta, source, children }: DashboardCardProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex h-full flex-col gap-3 surface-panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="font-mono text-eyebrow text-subtle uppercase">
          {title}
        </h2>
        {meta && <div className="font-mono text-meta text-muted">{meta}</div>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      {source && <p className="font-mono text-meta text-faint">{source}</p>}
    </section>
  );
}
