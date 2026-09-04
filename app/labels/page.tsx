import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Labels | MorgenMachIch",
};

export default function LabelsPage() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-sm text-base-content/60">Labels</p>
        <p className="text-base-content/40">Label management lands in the Labels epic.</p>
      </div>
    </div>
  );
}
