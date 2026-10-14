import type { Metadata } from "next";
import Link from "next/link";
import StatusPage from "@/components/layout/StatusPage";

export const metadata: Metadata = {
  title: "Not found",
};

/** Shown for any URL that doesn't match a route (#177). Since #83 the
 * root layout has no app navigation, so it fills the screen and offers
 * the way back into the app. */
export default function NotFound() {
  return (
    <StatusPage
      fullScreen
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
