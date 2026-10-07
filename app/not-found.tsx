import type { Metadata } from "next";
import Link from "next/link";
import StatusPage from "@/components/layout/StatusPage";

export const metadata: Metadata = {
  title: "Not found | MorgenMachIch",
};

/** Shown for any URL that doesn't match a route (#177). Rendered inside
 * the root layout, so the nav rail stays available. */
export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Nothing here"
      description="This page doesn't exist — maybe the link is old, or the address has a typo."
    >
      <Link href="/today" className="btn btn-primary btn-sm cursor-pointer">
        Back to Today
      </Link>
    </StatusPage>
  );
}
