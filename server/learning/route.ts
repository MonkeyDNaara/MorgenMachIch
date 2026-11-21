import "server-only";
import type { z } from "zod";
import { handle } from "@/server/api/handle";
import type { Access } from "@/server/api/handler";
import { ok, readJson } from "@/server/api/json";
import { getLearningEnv } from "@/server/env";
import { callLearning, type LearningAction } from "@/server/learning/client";
import { requireLearningOwner } from "@/server/learning/owner";

type LearningRouteOptions<R> = {
  access: Access;
  /** Request body schema; without one the route reads no body. */
  body?: z.ZodType<unknown>;
  /** Schema of n8n's answer. */
  response: z.ZodType<R>;
};

/**
 * One `/api/learning/*` Route Handler (#462): `handle()` (CSRF checks, session, error
 * contract) → owner check (404 for everyone else) → body schema → n8n → `200 { data }`.
 * The owner check runs before the body is read, so other users learn nothing from a 422.
 */
export function learningRoute<R>(action: LearningAction, options: LearningRouteOptions<R>) {
  return handle({ access: options.access }, async ({ api, request }) => {
    const env = requireLearningOwner(getLearningEnv(), api.ctx.userId);
    const body = options.body ? options.body.parse(await readJson(request)) : undefined;
    return ok(await callLearning(env, action, options.response, { body }));
  });
}
