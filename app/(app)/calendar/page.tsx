import type { Metadata } from "next";
import CalendarView from "@/components/task/CalendarView";

export const metadata: Metadata = {
  title: "Calendar",
};

export default function CalendarPage() {
  return <CalendarView />;
}
