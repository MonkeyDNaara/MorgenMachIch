import { LearningDeepenSchema, LearningIdBodySchema } from "@/lib/types/learning";
import { learningRoute } from "@/server/learning/route";

/** `POST /api/learning/deepen` `{ id }` (#462): a deeper explanation ("Unsure"). */
export const POST = learningRoute("deepen", {
  access: "write",
  body: LearningIdBodySchema,
  response: LearningDeepenSchema,
});
