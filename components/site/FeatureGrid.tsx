import { FEATURES } from "@/lib/site/content";

/** Nine feature cards (#85). */
export default function FeatureGrid() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-20 py-16 sm:py-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-9 max-w-2xl">
          <p className="font-mono text-eyebrow text-muted uppercase">Features</p>
          <h2 id="features-heading" className="mt-2 text-title">
            Everything a day needs. Nothing it doesn&apos;t.
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="surface-raised p-5">
              <span className="mb-4 grid size-9 place-items-center rounded-xl text-accent surface-sunken">
                <Icon size={18} strokeWidth={1.8} aria-hidden />
              </span>
              <h3 className="mb-1.5 text-base font-semibold">{title}</h3>
              <p className="text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
