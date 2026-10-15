import type { ReactNode } from "react";
import SiteHeader from "@/features/site/components/SiteHeader";
import SiteFooter from "@/features/site/components/SiteFooter";

type LegalPageProps = {
  title: string;
  /** One English sentence for visitors who don't read German. */
  intro: string;
  children: ReactNode;
};

/**
 * Frame of the legal pages (#378): site header without the section links,
 * a narrow German text column (lang="de" for screen readers and
 * hyphenation), the footer. Headings and paragraphs are styled here, so the
 * pages only write plain h2/p/ul/a.
 */
export default function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <>
      <SiteHeader sections={false} />
      <main id="main" className="flex-1 py-12 sm:py-16">
        <article className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <p className="font-mono text-eyebrow text-muted uppercase">Legal</p>
          <h1 lang="de" className="mt-2 text-title">
            {title}
          </h1>
          <p className="mt-3 text-sm text-subtle">{intro}</p>
          <div
            lang="de"
            className="mt-10 flex flex-col gap-4 text-muted hyphens-auto [&_a]:text-accent [&_a]:underline-offset-2 [&_a:hover]:underline [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-base-content [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-base-content [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1"
          >
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
