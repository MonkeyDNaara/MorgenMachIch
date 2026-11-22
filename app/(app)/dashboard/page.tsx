import type { Metadata } from "next";
import DashboardView from "@/features/dashboard/components/DashboardView";
import NewTaskFromUrl from "@/features/tasks/components/NewTaskFromUrl";
import { isLearningOwner } from "@/server/learning/isLearningOwner";
import SampleDataFromUrl from "@/features/demo/components/SampleDataFromUrl";

// A static title; TitleCount (#187) still adds the open-today count in front, app-wide.
export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // Decided on the server: for everyone else the row does not exist and sends no request.
  const showLearn = await isLearningOwner();
  return (
    <>
      <NewTaskFromUrl />
      <SampleDataFromUrl />
      <DashboardView showLearn={showLearn} />
    </>
  );
}
