import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import LogoMark from "@/components/ui/LogoMark";
import BackLink from "@/features/auth/components/BackLink";

// Sign-in pages are no search results (#445).
export const metadata: Metadata = { robots: { index: false } };

/**
 * Layout of the auth pages (#445): one centred card with the logo above and
 * the legal links below — the same on every screen size. No app shell.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-6 px-4 py-10">
      <Link
        href="/?landing"
        className="flex items-center gap-2.5 rounded-xl outline-none! focus-visible:shadow-focus"
      >
        <LogoMark size={30} />
        <span className="text-lg font-bold tracking-tight">
          <span className="text-primary">Morgen</span>MachIch
        </span>
      </Link>
      {children}
      <nav aria-label="Legal" className="flex flex-wrap justify-center gap-4 text-xs text-faint">
        <Link href="/impressum" className="hover:text-muted">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-muted">
          Datenschutz
        </Link>
        {/* useSearchParams needs a Suspense boundary; the fallback is the plain link. */}
        <Suspense
          fallback={
            <Link href="/?landing" className="hover:text-muted">
              ← Back
            </Link>
          }
        >
          <BackLink className="hover:text-muted" />
        </Suspense>
      </nav>
    </main>
  );
}
