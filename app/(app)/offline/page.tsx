import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import StatusPage from "@/components/layout/StatusPage";

export const metadata: Metadata = {
  title: "Offline",
};

/** Fallback the service worker shows for a page that isn't cached yet
 * while there's no connection (#81). Precached on install, so it must stay
 * a static page. */
export default function OfflinePage() {
  return (
    <StatusPage
      code={<WifiOff aria-hidden size={64} strokeWidth={1.75} className="inline-block" />}
      title="You're offline"
      description="This page hasn't been saved on this device yet. Pages you've opened before — like Today, Tasks and Calendar — still work without a connection."
    >
      <Link href="/today" className="btn btn-primary btn-sm cursor-pointer">
        Back to Today
      </Link>
    </StatusPage>
  );
}
