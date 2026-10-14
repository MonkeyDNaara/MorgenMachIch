import type { Metadata } from "next";
import TodayView from "@/components/task/TodayView";

export const metadata: Metadata = {
  title: "Today",
};

export default function TodayPage() {
  return <TodayView />;
}
