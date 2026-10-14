import type { Metadata } from "next";
import TodayView from "@/components/task/TodayView";
import NewTaskFromUrl from "@/components/task/NewTaskFromUrl";
import SampleDataFromUrl from "@/components/task/SampleDataFromUrl";

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
