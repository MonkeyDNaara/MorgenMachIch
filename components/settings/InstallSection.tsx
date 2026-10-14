"use client";

import InstallPanel from "@/components/settings/InstallPanel";
import { applyUpdate, promptInstall } from "@/lib/pwa/pwaStore";
import { usePwa } from "@/lib/pwa/usePwa";

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
