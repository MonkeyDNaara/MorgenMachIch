import { BUILD, DECISIONS, STACK } from "@/features/site/lib/content";
import { SITE_STATS } from "@/features/site/lib/stats";

/** "How it's built" (#375): numbers, the stack with the reason for each tool, decisions. */
export default function HowItsBuilt() {
  return (
    <section
      id="built"
      aria-labelledby="built-heading"
      className="scroll-mt-20 border-t border-line py-16 sm:py-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-9 max-w-2xl">
          <p className="font-mono text-eyebrow text-muted uppercase">{BUILD.eyebrow}</p>
          <h2 id="built-heading" className="mt-2 text-title">
            {BUILD.title}
          </h2>
          <p className="mt-3 text-muted">{BUILD.text}</p>
        </div>

        <dl className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SITE_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse surface-panel p-4">
              <dt className="text-sm text-muted">{stat.label}</dt>
              <dd className="font-mono text-3xl font-semibold tracking-tight text-accent">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-4 lg:grid-cols-2">
          <ul className="surface-panel px-5 py-2">
            {STACK.map((item) => (
              <li
                key={item.name}
                className="grid gap-0.5 border-b border-line py-3 text-sm last:border-0 sm:grid-cols-[10rem_1fr] sm:gap-4"
              >
                <span className="font-semibold">{item.name}</span>
                <span className="text-muted">{item.why}</span>
              </li>
            ))}
          </ul>
          <ul className="grid gap-4">
            {DECISIONS.map((decision) => (
              <li key={decision.title} className="surface-raised p-5">
                <p className="font-mono text-eyebrow text-accent uppercase">{decision.tag}</p>
                <h3 className="mt-1.5 mb-1.5 text-base font-semibold">{decision.title}</h3>
                <p className="text-sm text-muted">{decision.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
