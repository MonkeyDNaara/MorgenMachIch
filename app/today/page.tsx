import type { Metadata } from "next";
import TodayView from "@/components/task/TodayView";

export const metadata: Metadata = {
  title: "Today | MorgenMachIch",
};

export default function TodayPage() {
  return <TodayView />;
}
