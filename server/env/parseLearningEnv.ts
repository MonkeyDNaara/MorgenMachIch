import { z } from "zod";

/**
 * Daily Learning Agent environment (#462). Optional as a whole: with none of the three
 * variables set the learning routes are off (404 for everyone). Setting only some of them
 * is a configuration error. Messages name the variable, never its value.
 */
export const LearningEnvSchema = z.object({
  /** Base URL of the n8n webhooks, e.g. `https://<domain>/webhook/learning`. */
  LEARNING_API_URL: z.string().regex(/^https:\/\/\S+$/, "must be an https:// URL"),
  /** n8n Header Auth secret (`X-Api-Key`). */
  LEARNING_API_KEY: z.string().min(32, "must be at least 32 characters"),
  /** Neon Auth user id of the only user who may use the widget. */
  LEARNING_OWNER_ID: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "must be a user id (uuid)",
    ),
});

export type LearningEnv = z.infer<typeof LearningEnvSchema>;

const NAMES = Object.keys(LearningEnvSchema.shape) as (keyof LearningEnv)[];

/** The learning settings, or null when the feature is off (no variable set). */
export function parseLearningEnv(source: Record<string, string | undefined>): LearningEnv | null {
  const present = NAMES.filter((name) => source[name]?.trim());
  if (present.length === 0) return null;
  const values = Object.fromEntries(NAMES.map((name) => [name, source[name]?.trim()]));
  const result = LearningEnvSchema.safeParse(values);
  if (result.success) {
    return { ...result.data, LEARNING_API_URL: result.data.LEARNING_API_URL.replace(/\/+$/, "") };
  }
  const problems = result.error.issues.map(
    (issue) =>
      `${issue.path.join(".")}: ${issue.code === "invalid_type" ? "missing" : issue.message}`,
  );
  throw new Error(`Invalid learning environment — ${problems.join("; ")}. See .env.example.`);
}
