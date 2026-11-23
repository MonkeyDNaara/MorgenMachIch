import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LearnView from "@/features/learning/components/LearnView";
import { parseLearnSlot } from "@/features/learning/lib/learnSlot";
import { isLearningOwner } from "@/server/learning/isLearningOwner";

export const metadata: Metadata = {
  title: "Learn",
};

type LearnPageProps = {
  searchParams: Promise<{ slot?: string | string[] }>;
};

// Owner only (#467): everyone else gets the normal not-found page, decided on the server
// before anything renders, so there is no flash and no request to n8n. `?slot=review` (#481)
// opens the review; anything else is the new topic.
export default async function LearnPage({ searchParams }: LearnPageProps) {
  if (!(await isLearningOwner())) notFound();
  const { slot } = await searchParams;
  return <LearnView slot={parseLearnSlot(slot)} />;
}
