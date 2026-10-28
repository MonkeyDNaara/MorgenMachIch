"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { safeNextPath } from "@/features/auth/lib/authInput";

/**
 * "← Back" under the auth card (#445). The app's links to the auth pages
 * carry the page they came from as `?next=` (nav, More menu, Settings), so
 * Back returns there — the same place sign-in leads to. Without `next`
 * (a bookmark, another site) it goes to the landing page.
 */
export default function BackLink({ className }: { className?: string }) {
  const next = useSearchParams().get("next");
  return (
    <Link href={next ? safeNextPath(next) : "/?landing"} className={className}>
      ← Back
    </Link>
  );
}
