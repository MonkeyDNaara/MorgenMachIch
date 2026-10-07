"use client";

import { useEffect } from "react";
import StatusPage from "@/components/layout/StatusPage";
import "./globals.css";

/**
 * Last-resort boundary (#177) for errors in the root layout itself,
 * where app/error.tsx can't help because the layout (and its nav rail)
 * is what failed. It replaces the root layout, so it must render its own
 * <html>/<body> and import the global styles itself. Plain <a> instead
 * of next/link on purpose: if routing is what broke, a full page load is
 * the safest way out.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" data-theme="morgen">
      <body className="bg-base-100 text-base-content">
        <StatusPage
          fullScreen
          code="Oops"
          title="Something went badly wrong"
          description="The app failed to load properly. Try again, or reload the page."
        >
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="btn btn-primary btn-sm cursor-pointer">
              Try again
            </button>
            <a href="/today" className="btn btn-ghost btn-sm cursor-pointer">
              Go to Today
            </a>
          </div>
        </StatusPage>
      </body>
    </html>
  );
}
