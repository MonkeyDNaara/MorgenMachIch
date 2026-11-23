import "server-only";
import type { z } from "zod";
import { ApiError } from "@/server/api/errors";
import type { LearningEnv } from "@/server/env/parseLearningEnv";

/** The n8n webhooks of the Daily Learning Agent (#462), relative to `LEARNING_API_URL`. */
export type LearningAction = "today" | "next" | "deepen" | "quiz" | "quiz/answer" | "review";

/** The webhooks n8n serves as GET (no body); every other action is a POST. */
const GET_ACTIONS: readonly LearningAction[] = ["today", "review"];

/** LLM calls (generate, deepen, quiz) take 5–30 s; anything longer counts as offline. */
export const LEARNING_TIMEOUT_MS = 60_000;

export function learningOffline(): ApiError {
  return new ApiError(503, "learning_offline", "Learning is offline. Is the Mac on?");
}

type CallOptions = {
  body?: unknown;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

async function readJsonBody(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.toLowerCase().includes("json")) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Calls one n8n webhook server side with the `X-Api-Key` (#462) and validates the answer.
 * The key and the n8n URL never reach the browser or the error messages.
 *
 * - 2xx with a valid JSON body → the parsed data
 * - JSON 400 → 422 `validation`, JSON 404 → 404 `not_found` (n8n's own checks)
 * - everything else → 503 `learning_offline`: timeout, network error, 5xx, 403 (wrong key),
 *   a non-JSON answer (offline ngrok sends an HTML 404) or a body that fails the schema
 */
export async function callLearning<T>(
  env: LearningEnv,
  action: LearningAction,
  schema: z.ZodType<T>,
  { body, fetchImpl = fetch, timeoutMs = LEARNING_TIMEOUT_MS }: CallOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Api-Key": env.LEARNING_API_KEY,
    // ngrok's free plan shows a browser warning page unless this header is present.
    "ngrok-skip-browser-warning": "1",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetchImpl(`${env.LEARNING_API_URL}/${action}`, {
      method: GET_ACTIONS.includes(action) ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[learning] ${action}: n8n unreachable`, (error as Error)?.name ?? error);
    throw learningOffline();
  }

  const json = await readJsonBody(response);
  if (response.ok) {
    const result = schema.safeParse(json);
    if (result.success) return result.data;
    console.error(`[learning] ${action}: unexpected answer`, result.error.issues);
    throw learningOffline();
  }
  if (json !== undefined && response.status === 400) {
    throw new ApiError(422, "validation", "The learning agent refused the request.");
  }
  if (json !== undefined && response.status === 404) {
    throw new ApiError(404, "not_found", "That learning topic doesn't exist.");
  }
  console.error(`[learning] ${action}: n8n answered ${response.status}`);
  throw learningOffline();
}
