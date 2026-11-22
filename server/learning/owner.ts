import "server-only";
import { ApiError } from "@/server/api/errors";
import type { LearningEnv } from "@/server/env/parseLearningEnv";

/** True when the feature is on and `userId` is the one person it belongs to. */
export function isLearningOwnerId(
  env: LearningEnv | null,
  userId: string | null,
): env is LearningEnv {
  return env !== null && userId !== null && userId === env.LEARNING_OWNER_ID;
}

/**
 * The learning widget belongs to one person (#462): the n8n table holds Niko's topics and
 * every call costs Anthropic credits. Anyone else — and everyone while the feature is off —
 * gets the same 404 as an unknown path, so the routes look like they don't exist.
 */
export function requireLearningOwner(env: LearningEnv | null, userId: string): LearningEnv {
  if (!isLearningOwnerId(env, userId)) {
    throw new ApiError(404, "not_found", "There is no such endpoint.");
  }
  return env;
}

/**
 * Server-side owner check for pages (#467), pure so it is tested without Next or Neon: the
 * caller passes how to read the session. Never throws; a failing session check counts as "no".
 */
export async function isLearningOwnerFrom(
  env: LearningEnv | null,
  readUserId: () => Promise<string | null>,
): Promise<boolean> {
  if (!env) return false; // feature off: no session lookup at all
  try {
    return isLearningOwnerId(env, await readUserId());
  } catch {
    return false;
  }
}
