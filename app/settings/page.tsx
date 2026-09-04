import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | MorgenMachIch",
};

export default function SettingsPage() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-sm text-base-content/60">Settings</p>
        <p className="text-base-content/40">Settings & data export/import land in the Settings epic.</p>
      </div>
    </div>
  );
}
