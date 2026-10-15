import type { Metadata } from "next";
import TodayView from "@/features/today/components/TodayView";
import NewTaskFromUrl from "@/features/tasks/components/NewTaskFromUrl";
import SampleDataFromUrl from "@/features/demo/components/SampleDataFromUrl";

export const metadata: Metadata = {
  title: "Today",
};

export default function TodayPage() {
  return (
    <>
      <NewTaskFromUrl />
      <SampleDataFromUrl />
      <TodayView />
    </>
  );
}
