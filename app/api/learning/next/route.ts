import { LearningTopicSchema } from "@/lib/types/learning";
import { learningRoute } from "@/server/learning/route";

/** `POST /api/learning/next` (#462): always a new topic ("New topic"). */
export const POST = learningRoute("next", { access: "write", response: LearningTopicSchema });
