import type { LearningAction } from "@/features/learning/lib/learningStore";

/** What the loading state says while each learning request runs (/learn and the dashboard cards). */
export const LOADING_LABEL: Record<LearningAction, string> = {
  today: "Fetching today’s topic…",
  next: "Choosing and writing the next topic…",
  deepen: "Writing a deeper explanation…",
  quiz: "Building your quiz…",
  answer: "Checking your answers…",
  review: "Fetching your review…",
};
