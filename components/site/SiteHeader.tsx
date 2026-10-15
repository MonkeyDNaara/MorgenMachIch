import Link from "next/link";
import LogoMark from "@/components/layout/LogoMark";
import { SITE_LINKS, SITE_NAV } from "@/lib/site/content";

/**
 * Sticky header of the landing page (#85): logo, anchor links, GitHub and
 * "Open app". The legal pages (#378) pass `sections={false}`: the anchor
 * links only exist on the landing page.
 */
export default function SiteHeader({ sections = true }: { sections?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base-100/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/?landing"
          className="flex items-center gap-2.5 rounded-xl text-base font-bold tracking-tight outline-none! focus-visible:shadow-focus"
        >
          <LogoMark size={30} />
          <span>
            <span className="text-primary">Morgen</span>MachIch
          </span>
        </Link>
        <nav
          aria-label="Page sections"
          className="ml-auto hidden items-center gap-6 text-sm md:flex"
        >
          {sections &&
            SITE_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-muted transition-colors hover:text-base-content"
              >
                {item.label}
              </a>
            ))}
          <a
            href={SITE_LINKS.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors hover:text-base-content"
          >
            GitHub
          </a>
        </nav>
        <Link
          href={SITE_LINKS.app}
          className="btn btn-sm ml-auto cursor-pointer rounded-full border-line-strong surface-raised md:ml-0"
        >
          Open app →
        </Link>
      </div>
    </header>
  );
}
