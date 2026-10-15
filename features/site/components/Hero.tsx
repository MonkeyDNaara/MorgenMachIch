import CallToActions from "@/features/site/components/CallToActions";
import HeroShot from "@/features/site/components/HeroShot";
import { HERO } from "@/features/site/lib/content";

/** First screen of the landing page (#85): promise, two ways in, the real Today screen (#376). */
export default function Hero() {
  return (
    <section className="site-glow">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-20">
        <div>
          <p className="font-mono text-eyebrow text-muted uppercase">{HERO.eyebrow}</p>
          <h1 className="mt-4 mb-5 text-[clamp(2.5rem,6vw,4rem)] leading-[0.98] font-bold tracking-[-0.03em]">
            {HERO.titleStart}
            <br />
            {HERO.titleEnd} <span className="text-primary">{HERO.titleBrand}</span>
          </h1>
          <p className="max-w-xl text-lg text-muted">{HERO.lead}</p>
          <CallToActions className="mt-8 mb-3" />
          <p className="text-meta text-subtle">{HERO.note}</p>
        </div>
        <HeroShot />
      </div>
    </section>
  );
}
