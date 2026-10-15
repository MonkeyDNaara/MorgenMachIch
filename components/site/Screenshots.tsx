import ScreenshotTabs from "@/components/site/ScreenshotTabs";
import { SCREENSHOTS } from "@/lib/site/content";

/** "Screenshots" (#376): the four main views in both themes, after the features. */
export default function Screenshots() {
  return (
    <section
      id="screenshots"
      aria-labelledby="screenshots-heading"
      className="scroll-mt-20 pb-16 sm:pb-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="font-mono text-eyebrow text-muted uppercase">{SCREENSHOTS.eyebrow}</p>
          <h2 id="screenshots-heading" className="mt-2 text-title">
            {SCREENSHOTS.title}
          </h2>
          <p className="mt-3 text-muted">{SCREENSHOTS.text}</p>
        </div>
        <ScreenshotTabs />
      </div>
    </section>
  );
}
