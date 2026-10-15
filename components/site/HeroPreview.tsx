/**
 * A drawn preview of the Today view in a browser frame (#85). Decorative
 * stand-in until the real screenshots (#376); built from the app's own
 * tokens, so it follows the theme.
 */
const CARDS = [
  {
    title: "Submit tax return",
    label: "#admin",
    time: "14:00",
    ring: "border-error",
    chip: "var(--color-error)",
  },
  {
    title: "Gym — legs",
    label: "#health",
    time: "18:30",
    ring: "border-warning",
    chip: "var(--color-success)",
  },
  {
    title: "Call mom",
    label: "#family",
    time: "19:00",
    ring: "border-line-strong",
    chip: "#a5a0ff",
  },
];

export default function HeroPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-line-strong bg-base-100 shadow-overlay"
    >
      <div className="flex items-center gap-1.5 border-b border-line bg-base-200 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 truncate font-mono text-[11px] text-faint">
          morgen-mach-ich.onrender.com/today
        </span>
      </div>
      <div className="grid min-h-80 grid-cols-1 sm:grid-cols-[7.5rem_1fr]">
        <div className="hidden flex-col gap-1 border-r border-line p-3 text-xs text-muted sm:flex">
          <span className="rounded-lg bg-base-300 px-2 py-1.5 text-base-content shadow-raised-sm">
            Today
          </span>
          {["Tasks", "Calendar", "Labels", "Stats"].map((item) => (
            <span key={item} className="px-2 py-1.5">
              {item}
            </span>
          ))}
        </div>
        <div className="p-5">
          <p className="font-mono text-eyebrow text-muted uppercase">Today · 3 open</p>
          <p className="text-4xl leading-none font-bold tracking-tight">Friday.</p>
          <div className="mt-3 mb-1 h-1.5 overflow-hidden rounded-full bg-track">
            <div className="h-full w-3/5 bg-accent" />
          </div>
          <p className="font-mono text-[11px] text-subtle">3 of 5 done — 2 to go before Morgen.</p>
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="mt-2 flex items-center gap-2.5 rounded-xl border border-line bg-base-300 px-3 py-2.5 text-[13px] shadow-raised-sm"
            >
              <span className={`size-4 shrink-0 rounded-full border-2 ${card.ring}`} />
              <span className="truncate">{card.title}</span>
              <span
                className="rounded-full px-2 font-mono text-[11px]"
                style={{
                  color: card.chip,
                  background: `color-mix(in oklab, ${card.chip} 18%, transparent)`,
                }}
              >
                {card.label}
              </span>
              <span className="ml-auto font-mono text-[11px] text-accent">{card.time}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-[13px] text-subtle line-through">
            <span className="size-4 shrink-0 rounded-full bg-accent" />
            Water the plants
          </div>
        </div>
      </div>
    </div>
  );
}
