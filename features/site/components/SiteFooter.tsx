import Link from "next/link";
import { SITE_LINKS } from "@/features/site/lib/content";
import { LEGAL_LINKS } from "@/features/site/lib/legal";

/** Footer of the site pages (#85), with the legal links (#378). */
export default function SiteFooter() {
  return (
    <footer className="border-t border-line py-7 text-meta text-subtle">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 sm:px-6">
        <span className="mr-auto">MorgenMachIch · {new Date().getFullYear()}</span>
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition-colors hover:text-base-content"
          >
            {link.label}
          </Link>
        ))}
        <a
          href={SITE_LINKS.repo}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-base-content"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
