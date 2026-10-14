import type { Metadata } from "next";
import Link from "next/link";
import LogoMark from "@/components/layout/LogoMark";

export const metadata: Metadata = {
  title: { absolute: "MorgenMachIch — a to-do app for today and Morgen" },
};

/**
 * `/` — the landing page (#14). For now a simple placeholder (#83); the
 * real sections follow in #85. Returning users are sent to /today by a
 * script in the root layout's <head>; `/?landing` shows the page anyway.
 */
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-8 text-center">
      <LogoMark size={56} />
      <h1 className="text-title font-semibold tracking-tight">MorgenMachIch</h1>
      <p className="max-w-md text-muted">
        Tasks, a calendar, routines that repeat on their own and a quick-add that understands “Call
        mom fri 3pm”. Your data stays in your browser.
      </p>
      <Link href="/today" className="btn btn-primary cursor-pointer">
        Open the app
      </Link>
    </main>
  );
}
