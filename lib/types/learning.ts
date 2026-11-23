import { z } from "zod";

/**
 * The Daily Learning Agent (#462): request bodies of `/api/learning/*` and the answers of the
 * n8n webhooks behind them. Pure, so the Learn today card (#463) uses the same types.
 * Response schemas are loose on purpose (unknown extra fields are dropped, not refused), so a
 * new column in n8n doesn't take the widget offline; request bodies are `.strict()`.
 *
 * Checked against real n8n answers on 2026-11-21 (today, quiz, quiz/answer, a 404 from deepen:
 * `{ ok: false, error: "topic not in learning" }`) and 2026-11-23 (status, understood_at,
 * times_taught, review; #477). The fields added on 2026-11-23 are required on purpose: a
 * deviating answer shows up as the offline state instead of a silently wrong badge.
 */

/** n8n Data Table row id. */
export const LearningIdSchema = z.number().int().positive();

const emptyToNull = (value: unknown) => (value === "" || value === undefined ? null : value);

/** n8n sends UTC (`…Z`); an offset is accepted too, so a format change there doesn't break us. */
const IsoDateTimeSchema = z.iso.datetime({ offset: true });

/** `understood` only by passing the quiz; a failed quiz sets `learning` again (understood_at stays). */
export const LearningStatusSchema = z.enum(["learning", "understood"]);
export type LearningStatus = z.infer<typeof LearningStatusSchema>;

export const LearningTopicSchema = z.object({
  id: LearningIdSchema,
  topic: z.string().min(1),
  explanation: z.string(),
  /** Written by "Unsure" (deepen); empty until then. */
  deep_explanation: z.preprocess(emptyToNull, z.string().nullable()),
  status: LearningStatusSchema,
  /** First time the quiz was passed (UTC); `null` while never understood. */
  understood_at: IsoDateTimeSchema.nullable(),
  /** Deliveries as topic of the day plus reviews; quizzes don't count. */
  times_taught: z.number().int().nonnegative(),
});
export type LearningTopic = z.infer<typeof LearningTopicSchema>;

/**
 * Answer of "Unsure" (deepen). Only `id` and the new `deep_explanation` are required — the card
 * merges them into the topic it already shows — so the route doesn't depend on whether n8n also
 * returns the rest of the row.
 */
export const LearningDeepenSchema = z.object({
  id: LearningIdSchema,
  deep_explanation: z.string().min(1),
});
export type LearningDeepen = z.infer<typeof LearningDeepenSchema>;

export const LearningQuizSchema = z.object({
  id: LearningIdSchema,
  questions: z
    .array(z.object({ question: z.string().min(1), options: z.array(z.string()).min(2) }))
    .min(1),
});
export type LearningQuiz = z.infer<typeof LearningQuizSchema>;

export const LearningQuizResultSchema = z.object({
  id: LearningIdSchema,
  topic: z.string(),
  passed: z.boolean(),
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  results: z.array(
    z.object({
      question: z.string(),
      your_answer: z.string(),
      correct_answer: z.string(),
      correct: z.boolean(),
      why: z.string(),
    }),
  ),
  status: LearningStatusSchema,
  understood_at: IsoDateTimeSchema.nullable(),
});
export type LearningQuizResult = z.infer<typeof LearningQuizResultSchema>;

/** `POST /api/learning/deepen` and `/quiz`. */
export const LearningIdBodySchema = z.object({ id: LearningIdSchema }).strict();

/** `POST /api/learning/quiz/answer`: one option index per question. */
export const LearningAnswerBodySchema = z
  .object({
    id: LearningIdSchema,
    answers: z.array(z.number().int().nonnegative()).min(1).max(10),
  })
  .strict();
