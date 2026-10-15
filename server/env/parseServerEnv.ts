import { z } from "zod";

/**
 * Server-side environment variables (#304). Pure, so it is unit-tested without
 * `server-only`; read through `getServerEnv()` in `server/env/index.ts`.
 * Error messages name the variable, never its value.
 */
export const ServerEnvSchema = z.object({
  /** Pooled connection (PgBouncer, transaction mode): used by the app. */
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "must be a postgres:// connection string"),
  /** Direct connection: migrations (drizzle-kit) only. */
  DATABASE_URL_UNPOOLED: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "must be a postgres:// connection string")
    .optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = ServerEnvSchema.safeParse(source);
  if (result.success) return result.data;
  const problems = result.error.issues.map(
    (issue) =>
      `${issue.path.join(".")}: ${issue.code === "invalid_type" ? "missing" : issue.message}`,
  );
  throw new Error(`Invalid server environment — ${problems.join("; ")}. See .env.example.`);
}
