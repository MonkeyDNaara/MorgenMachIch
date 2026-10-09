"use client";

import { useEffect } from "react";
import Link from "next/link";
import StatusPage from "@/components/layout/StatusPage";
import { isStorageError } from "@/lib/utils/isStorageError";

/**
 * Route-level error boundary (#177): catches errors thrown while
 * rendering any page, keeps the nav rail from the root layout, and
 * offers a retry. Browser-storage failures (blocked IndexedDB, e.g. in a
 * private window) get their own hint, since that's the one runtime
 * failure this local-first app can realistically hit.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const storage = isStorageError(error);

  return (
    <StatusPage
      code="Oops"
      title={storage ? "Can't reach your browser storage" : "Something went wrong"}
      description={
        storage
          ? "MorgenMachIch keeps your tasks in this browser (IndexedDB), and it looks blocked or unavailable — private windows and strict privacy settings can do that. Try a normal window, then try again."
          : "The page hit an unexpected error. Try again — if it keeps happening, reload the page or export a backup from Settings."
      }
    >
      <div className="flex gap-2">
        <button type="button" onClick={reset} className="btn btn-primary btn-sm cursor-pointer">
          Try again
        </button>
        <Link href="/today" className="btn btn-ghost btn-sm cursor-pointer">
          Go to Today
        </Link>
      </div>
      <details className="w-full max-w-md text-left text-xs text-base-content/50">
        <summary className="cursor-pointer text-center">Technical details</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-box surface-sunken p-3 font-mono">
          {`${error.name}: ${error.message}`}
          {error.digest ? `\ndigest: ${error.digest}` : ""}
        </pre>
      </details>
    </StatusPage>
  );
}
