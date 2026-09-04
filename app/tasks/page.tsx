import type { Metadata } from "next";
import TaskList from "@/components/task/TaskList";

export const metadata: Metadata = {
  title: "Tasks | MorgenMachIch",
};

export default function TasksPage() {
  return <TaskList />;
}
