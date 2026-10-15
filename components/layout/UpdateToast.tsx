"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { applyUpdate, getPwaSnapshot, SERVER_SNAPSHOT, subscribePwa } from "@/lib/pwa/pwaStore";

/**
 * "New version available · Reload" (#82). A new deploy waits until the
 * user chooses, so nothing reloads mid-typing. The toast stays until it is
 * used or replaced; Settings → App offers the same Reload afterwards.
 * Renders nothing itself.
 */
export default function UpdateToast() {
  const { notify } = useToast();
  const { updateReady } = useSyncExternalStore(subscribePwa, getPwaSnapshot, () => SERVER_SNAPSHOT);

  useEffect(() => {
    if (updateReady) {
      notify("New version available", {
        action: { label: "Reload", onAction: applyUpdate },
        sticky: true,
      });
    }
  }, [updateReady, notify]);

  return null;
}
