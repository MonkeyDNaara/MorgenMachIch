import { LearningReviewSchema } from "@/lib/types/learning";
import { learningRoute } from "@/server/learning/route";

/**
 * `GET /api/learning/review` (#478): the review of the day, a topic that was understood before,
 * or `{ empty: true, reason }` while there is none (a normal 200, not an error). n8n writes on
 * the first call of a day only (`last_reviewed_at`, `times_taught + 1`).
 */
export const GET = learningRoute("review", { access: "read", response: LearningReviewSchema });
