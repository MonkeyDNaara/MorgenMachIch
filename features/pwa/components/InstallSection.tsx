"use client";

import InstallPanel from "@/features/pwa/components/InstallPanel";
import { applyUpdate, promptInstall } from "@/features/pwa/lib/pwaStore";
import { usePwa } from "@/features/pwa/hooks/usePwa";

/** Settings → App (#82): connects the install/update state to the panel. */
export default function InstallSection() {
  const { install, updateReady } = usePwa();
  return (
    <InstallPanel
      install={install}
      updateReady={updateReady}
      onInstall={() => void promptInstall()}
      onUpdate={applyUpdate}
    />
  );
}
