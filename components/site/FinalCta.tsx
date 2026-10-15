import CallToActions from "@/components/site/CallToActions";
import { FINAL_CTA } from "@/lib/site/content";

/** Closing call to action (#85). */
export default function FinalCta() {
  return (
    <section aria-labelledby="final-cta-heading" className="site-glow py-20 text-center">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 id="final-cta-heading" className="mb-7 text-title">
          {FINAL_CTA.title}
        </h2>
        <CallToActions className="justify-center" />
      </div>
    </section>
  );
}
