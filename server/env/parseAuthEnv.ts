import { z } from "zod";

/**
 * Neon Auth environment (#309). Separate from the database env on purpose:
 * the health check and the services keep working on a host where auth isn't
 * configured yet. Error messages name the variable, never its value.
 */
export const AuthEnvSchema = z.object({
  /** Auth URL of the Neon branch (Neon console → Auth). */
  NEON_AUTH_BASE_URL: z.string().regex(/^https:\/\/\S+$/, "must be an https:// URL"),
  /** Signs the session cookies; Neon Auth requires at least 32 characters. */
  NEON_AUTH_COOKIE_SECRET: z.string().min(32, "must be at least 32 characters"),
});

export type AuthEnv = z.infer<typeof AuthEnvSchema>;

export function parseAuthEnv(source: Record<string, string | undefined>): AuthEnv {
  const result = AuthEnvSchema.safeParse(source);
  if (result.success) return result.data;
  const problems = result.error.issues.map(
    (issue) =>
      `${issue.path.join(".")}: ${issue.code === "invalid_type" ? "missing" : issue.message}`,
  );
  throw new Error(`Invalid auth environment — ${problems.join("; ")}. See .env.example.`);
}
