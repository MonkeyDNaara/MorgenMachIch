import type { ReactNode } from "react";

/**
 * Layout for the public pages (#83): the landing page at `/` and, later,
 * the Impressum. No app navigation, no IndexedDB — the root layout already
 * provides fonts, theme and the service worker.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full w-full min-w-0 flex-col">{children}</div>;
}
