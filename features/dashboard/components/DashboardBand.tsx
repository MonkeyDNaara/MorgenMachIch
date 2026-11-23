import type { ReactNode } from "react";

export type DashboardWidget = {
  id: string;
  node: ReactNode;
};

type DashboardBandProps = {
  /** The "Important" card: first on every layout. */
  important: ReactNode;
  /** The other cards in desktop order (Yesterday, Body, Training, This week). */
  widgets: DashboardWidget[];
  /**
   * Optional full-width second row (the Learn cards, #468, #480). Last in the DOM and on
   * desktop; below md it sits right after Important.
   */
  wide?: ReactNode;
};

/**
 * The briefing band of /dashboard (#421, #465). One DOM order for every
 * layout — the desktop order — so Tab follows what you see on desktop.
 *
 * - md+: a grid (2 columns, 3 from lg) in a `max-w-5xl` container. Cards are
 *   auto-placed in DOM order, so a missing widget never leaves a gap; the
 *   `wide` row spans every column below them.
 * - below md: one column; Important first, then the wide row, then the rest.
 */
export default function DashboardBand({ important, widgets, wide }: DashboardBandProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-4 md:grid md:grid-cols-2 md:py-6 lg:grid-cols-3">
      <div className="order-1 md:order-none">{important}</div>
      {widgets.map(({ id, node }) => (
        <div key={id} className="order-3 md:order-none">
          {node}
        </div>
      ))}
      {wide && <div className="order-2 md:order-none md:col-span-full">{wide}</div>}
    </div>
  );
}
