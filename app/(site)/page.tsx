import type { Metadata } from "next";
import SiteHeader from "@/features/site/components/SiteHeader";
import Hero from "@/features/site/components/Hero";
import QuickAddDemoSection from "@/features/site/components/QuickAddDemoSection";
import FeatureGrid from "@/features/site/components/FeatureGrid";
import Screenshots from "@/features/site/components/Screenshots";
import HowItsBuilt from "@/features/site/components/HowItsBuilt";
import BuiltBy from "@/features/site/components/BuiltBy";
import FinalCta from "@/features/site/components/FinalCta";
import SiteFooter from "@/features/site/components/SiteFooter";
import { SEO } from "@/features/site/lib/content";

// og:title, og:description and the image (app/opengraph-image.jpg, made by
// `npm run screenshots`) come from the root layout's openGraph (#377). Don't
// add an openGraph object here — it would replace the root one, image included.
export const metadata: Metadata = {
  title: { absolute: SEO.title },
  description: SEO.description,
  alternates: { canonical: "/" },
};

/**
 * `/` — the landing page (#14). Product half (#85): header, hero, live
 * quick-add demo (#86), features, screenshots (#376); how it's built and built by (#375);
 * final call to action, footer. Returning users are sent to /today by a
 * script in the root layout's <head>; `/?landing` shows the page anyway.
 * Server components only — no IndexedDB on this page.
 */
export default function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-full bg-base-300 px-4 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:shadow-focus"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <QuickAddDemoSection />
        <FeatureGrid />
        <Screenshots />
        <HowItsBuilt />
        <BuiltBy />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
