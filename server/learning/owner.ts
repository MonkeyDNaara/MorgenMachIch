import "server-only";
import { ApiError } from "@/server/api/errors";
import type { LearningEnv } from "@/server/env/parseLearningEnv";

/**
 * The learning widget belongs to one person (#462): the n8n table holds Niko's topics and
 * every call costs Anthropic credits. Anyone else — and everyone while the feature is off —
 * gets the same 404 as an unknown path, so the routes look like they don't exist.
 */
export function requireLearningOwner(env: LearningEnv | null, userId: string): LearningEnv {
  if (!env || userId !== env.LEARNING_OWNER_ID) {
    throw new ApiError(404, "not_found", "There is no such endpoint.");
  }
  return env;
}
