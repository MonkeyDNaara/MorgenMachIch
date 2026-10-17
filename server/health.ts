import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/server/db/types";

/**
 * Health check (#305). Two levels: liveness (the process answers — Render's
 * `healthCheckPath`, no database) and a deep check (`?db=1`, `select 1`
 * against Neon) for curl, n8n and monitoring. The body never carries error
 * text or secrets; details go to the server log.
 */

/** Neon wake-up (~0.7 s) + connect (~0.25 s) measured in #304, with room to spare. */
export const DB_CHECK_TIMEOUT_MS = 5_000;

export type DbHealth = { status: "ok"; latencyMs: number } | { status: "unavailable" };

export type HealthBody = {
  status: "ok" | "unavailable";
  version: string;
  commit: string | null;
  db?: DbHealth;
};

/**
 * Runs `select 1` with a timeout. Takes a getter so a missing or invalid
 * `DATABASE_URL` (thrown by `getServerEnv()` on first use) counts as
 * "unavailable" instead of crashing the route.
 */
export async function checkDatabase(
  getDatabase: () => Database,
  timeoutMs = DB_CHECK_TIMEOUT_MS,
  now: () => number = () => performance.now(),
): Promise<DbHealth> {
  const started = now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
    });
    await Promise.race([getDatabase().execute(sql`select 1`), timeout]);
    return { status: "ok", latencyMs: Math.round(now() - started) };
  } catch (error) {
    // Drizzle wraps driver errors ("Failed query: select 1"); the cause says why.
    console.error("[health] database check failed:", describeError(error));
    return { status: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause instanceof Error ? `${error.message} (${error.cause.message})` : error.message;
}

/** First 7 characters of a git SHA (Render's `RENDER_GIT_COMMIT`), or null. */
export function shortCommit(value: string | undefined): string | null {
  const sha = value?.trim().toLowerCase();
  return sha && /^[0-9a-f]{7,40}$/.test(sha) ? sha.slice(0, 7) : null;
}

/** The response body; `db` only when the deep check ran. */
export function buildHealthBody(input: {
  version: string;
  commit: string | null;
  db?: DbHealth;
}): HealthBody {
  const { version, commit, db } = input;
  return {
    status: db?.status === "unavailable" ? "unavailable" : "ok",
    version,
    commit,
    ...(db ? { db } : {}),
  };
}

/** 200 when healthy, 503 when the deep check found the database unavailable. */
export function healthHttpStatus(body: HealthBody): 200 | 503 {
  return body.status === "ok" ? 200 : 503;
}
