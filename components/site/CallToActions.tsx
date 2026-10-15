import Link from "next/link";
import { HERO, SITE_LINKS } from "@/lib/site/content";

/** The two ways in (#85): sample data (primary) and the empty app. */
export default function CallToActions({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <Link
        href={SITE_LINKS.sampleData}
        className="btn btn-primary cursor-pointer rounded-full px-5 shadow-gloss"
      >
        {HERO.sampleCta}
      </Link>
      <Link
        href={SITE_LINKS.app}
        className="btn cursor-pointer rounded-full border-line-strong px-5 surface-raised"
      >
        {HERO.appCta}
      </Link>
    </div>
  );
}
