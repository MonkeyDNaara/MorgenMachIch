import QuickAddDemoLoader from "@/components/site/QuickAddDemoLoader";
import { QUICK_ADD_DEMO } from "@/lib/site/content";

/** "Try it here" (#86): the live quick-add right under the hero. */
export default function QuickAddDemoSection() {
  return (
    <section id="demo" aria-labelledby="demo-heading" className="scroll-mt-20 pt-4 pb-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="font-mono text-eyebrow text-muted uppercase">{QUICK_ADD_DEMO.eyebrow}</p>
          <h2 id="demo-heading" className="mt-2 text-title">
            {QUICK_ADD_DEMO.title}
          </h2>
          <p className="mt-3 text-muted">{QUICK_ADD_DEMO.text}</p>
        </div>
        <div className="surface-panel p-5 sm:p-6">
          <QuickAddDemoLoader />
        </div>
      </div>
    </section>
  );
}
