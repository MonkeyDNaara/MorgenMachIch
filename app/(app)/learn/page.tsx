import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LearnView from "@/features/learning/components/LearnView";
import { isLearningOwner } from "@/server/learning/isLearningOwner";

export const metadata: Metadata = {
  title: "Learn",
};

// Owner only (#467): everyone else gets the normal not-found page, decided on the server
// before anything renders, so there is no flash and no request to n8n.
export default async function LearnPage() {
  if (!(await isLearningOwner())) notFound();
  return <LearnView />;
}
