import { LearningIdBodySchema, LearningQuizSchema } from "@/lib/types/learning";
import { learningRoute } from "@/server/learning/route";

/** `POST /api/learning/quiz` `{ id }` (#462): three questions, without the solutions. */
export const POST = learningRoute("quiz", {
  access: "write",
  body: LearningIdBodySchema,
  response: LearningQuizSchema,
});
