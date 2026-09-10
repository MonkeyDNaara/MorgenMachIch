import type { Metadata } from "next";
import CalendarView from "@/components/task/CalendarView";

export const metadata: Metadata = {
  title: "Calendar | MorgenMachIch",
};

export default function CalendarPage() {
  return <CalendarView />;
}
