import { SITE_LINKS } from "@/lib/site/content";

/** Footer of the landing page (#85); the Impressum link follows with #378. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-line py-7 text-meta text-subtle">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 sm:px-6">
        <span className="mr-auto">MorgenMachIch · {new Date().getFullYear()}</span>
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
