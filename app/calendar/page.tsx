import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar | MorgenMachIch",
};

export default function CalendarPage() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-sm text-base-content/60">Calendar</p>
        <p className="text-base-content/40">Month view lands in the Calendar View epic.</p>
      </div>
    </div>
  );
}
