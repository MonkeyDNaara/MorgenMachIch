import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks | MorgenMachIch",
};

export default function TasksPage() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-sm text-base-content/60">Tasks</p>
        <p className="text-base-content/40">Full task list lands in the List View epic.</p>
      </div>
    </div>
  );
}
