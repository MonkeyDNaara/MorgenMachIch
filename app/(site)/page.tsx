import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import Hero from "@/components/site/Hero";
import QuickAddDemoSection from "@/components/site/QuickAddDemoSection";
import FeatureGrid from "@/components/site/FeatureGrid";
import Screenshots from "@/components/site/Screenshots";
import HowItsBuilt from "@/components/site/HowItsBuilt";
import BuiltBy from "@/components/site/BuiltBy";
import FinalCta from "@/components/site/FinalCta";
import SiteFooter from "@/components/site/SiteFooter";
import { SEO } from "@/lib/site/content";

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
