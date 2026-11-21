import { LearningTopicSchema } from "@/lib/types/learning";
import { learningRoute } from "@/server/learning/route";

/** `GET /api/learning/today` (#462): today's topic; n8n generates one if none is open. */
export const GET = learningRoute("today", { access: "read", response: LearningTopicSchema });
