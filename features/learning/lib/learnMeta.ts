import type { LearningSlot } from "@/features/learning/lib/learningStore";
import { formatUnderstoodOn } from "@/features/learning/lib/formatUnderstood";
import type { LearningTopic } from "@/lib/types/learning";

export type LearnMeta = { label: string; understood: boolean };

/**
 * The meta line of a Learn card (#480), from the topic's `status` (not from the session):
 * - New: `learning · taught 1×` or `understood · taught 2×`
 * - Review: `understood 12 Nov · taught 2×`; a failed review quiz sets the topic back to
 *   `learning`, so it falls back to `learning · taught 2×`.
 */
export function learnMetaOf(topic: LearningTopic, slot: LearningSlot): LearnMeta {
  const understood = topic.status === "understood";
  const taught = `taught ${topic.times_taught}×`;
  if (!understood) return { label: `learning · ${taught}`, understood };
  const since =
    slot === "review" && topic.understood_at ? ` ${formatUnderstoodOn(topic.understood_at)}` : "";
  return { label: `understood${since} · ${taught}`, understood };
}
