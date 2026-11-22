import type { Metadata } from "next";
import DashboardView from "@/features/dashboard/components/DashboardView";
import NewTaskFromUrl from "@/features/tasks/components/NewTaskFromUrl";
import SampleDataFromUrl from "@/features/demo/components/SampleDataFromUrl";

// A static title; TitleCount (#187) still adds the open-today count in front, app-wide.
export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <>
      <NewTaskFromUrl />
      <SampleDataFromUrl />
      <DashboardView />
    </>
  );
}
