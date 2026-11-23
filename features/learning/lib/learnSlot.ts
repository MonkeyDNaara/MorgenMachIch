import type { LearningSlot } from "@/features/learning/lib/learningStore";

/** `?slot=review` selects the review; anything else (or nothing) is today's new topic. */
export function parseLearnSlot(value: string | string[] | undefined): LearningSlot {
  return value === "review" ? "review" : "today";
}

/** The /learn URL of a slot; New has no query so the plain link stays `/learn`. */
export function learnHref(slot: LearningSlot): string {
  return slot === "review" ? "/learn?slot=review" : "/learn";
}
