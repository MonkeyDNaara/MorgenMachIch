import { CircleCheck, Download, RotateCw, Share, SquarePlus } from "lucide-react";
import type { InstallState } from "@/features/pwa/lib/installState";

type InstallPanelProps = {
  /** `null` until the browser is known (server render, hydration). */
  install: InstallState | null;
  updateReady: boolean;
  onInstall: () => void;
  onUpdate: () => void;
};

const iconProps = { size: 14, strokeWidth: 1.8, "aria-hidden": true } as const;

/**
 * Settings → App (#82), presentational part: one install option per
 * browser and, when a new version waits, a Reload row (the same action as
 * the update toast, for anyone who missed it).
 */
export default function InstallPanel({
  install,
  updateReady,
  onInstall,
  onUpdate,
}: InstallPanelProps) {
  return (
    <section aria-labelledby="app-heading" className="flex flex-col gap-4 surface-panel p-4">
      <div className="flex flex-col gap-1">
        <h2 id="app-heading" className="font-mono text-eyebrow text-muted uppercase">
          App
        </h2>
        <p className="text-xs text-subtle">
          Optional: installed, MorgenMachIch gets its own window and icon and opens without a
          connection. It works the same in a browser tab.
        </p>
      </div>

      {install === "installed" && (
        <p className="flex items-center gap-2 text-sm">
          <CircleCheck size={16} strokeWidth={1.8} aria-hidden className="text-accent" />
          <span>
            <span className="font-medium">Installed</span>
            <span className="text-muted"> · runs as an app on this device</span>
          </span>
        </p>
      )}

      {install === "prompt" && (
        <button
          type="button"
          onClick={onInstall}
          className="btn btn-primary btn-sm w-fit cursor-pointer"
        >
          <Download {...iconProps} />
          Install app
        </button>
      )}

      {install === "ios-steps" && (
        <ol className="flex list-inside list-decimal flex-col gap-1.5 text-sm">
          <li>
            Tap <Share {...iconProps} className="inline align-[-2px]" /> <strong>Share</strong> in
            the browser bar
          </li>
          <li>
            Choose <SquarePlus {...iconProps} className="inline align-[-2px]" />{" "}
            <strong>Add to Home Screen</strong>
          </li>
          <li>
            Tap <strong>Add</strong>: MorgenMachIch appears as “Morgen”
          </li>
        </ol>
      )}

      {install === "unsupported" && (
        <p className="text-sm text-muted">
          This browser doesn&apos;t offer installing. Use the install icon in the address bar of
          Chrome or Edge, or Safari&apos;s Share menu on iPhone and iPad. Already installed? Open it
          from your apps.
        </p>
      )}

      {updateReady && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl surface-sunken p-3">
          <p className="text-sm">A new version is ready.</p>
          <button type="button" onClick={onUpdate} className="btn btn-sm cursor-pointer">
            <RotateCw {...iconProps} />
            Reload
          </button>
        </div>
      )}
    </section>
  );
}
