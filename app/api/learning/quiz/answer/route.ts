import { LearningAnswerBodySchema, LearningQuizResultSchema } from "@/lib/types/learning";
import { learningRoute } from "@/server/learning/route";

/** `POST /api/learning/quiz/answer` `{ id, answers }` (#462): one attempt per quiz. */
export const POST = learningRoute("quiz/answer", {
  access: "write",
  body: LearningAnswerBodySchema,
  response: LearningQuizResultSchema,
});
