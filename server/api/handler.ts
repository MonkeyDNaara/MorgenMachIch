import "server-only";
import { ApiError, errorToResponse } from "@/server/api/errors";
import { checkRequest } from "@/server/api/security";
import type { AuthResult } from "@/server/auth/requireUser";
import type { Services } from "@/server/services";
import type { RecordSource } from "@/server/services/context";

/** What a route needs (#455). Sessions may do everything; API keys (#315) get scopes. */
export type Access = "read" | "write" | "delete";

const SESSION_ACCESS: readonly Access[] = ["read", "write", "delete"];

/** Whether the caller may use a route. #315 adds the key scopes here (no key may `delete`). */
export function canAccess(source: RecordSource, access: Access): boolean {
  return source === "ui" && SESSION_ACCESS.includes(access);
}

export type HandlerArgs<P> = { api: Services; request: Request; params: P };

export type HandlerDeps = {
  requireUser: () => Promise<AuthResult>;
  services: (ctx: { userId: string; source: RecordSource }) => Services;
};

/**
 * Builds `handle()` (#455) — pure, so it is tested without Next or Neon; `handle.ts`
 * wires in the real session check and database. Every `/api/v1` route is one call:
 *
 *   export const GET = handle({ access: "read" }, async ({ api }) => ok(await api.getLabels()));
 *
 * Order: CSRF checks → session (401 / 503) → access (403) → the route → error contract.
 * Every response is `Cache-Control: no-store`.
 */
export function createHandler(deps: HandlerDeps) {
  return function handle<P = Record<string, never>>(
    options: { access: Access },
    fn: (args: HandlerArgs<P>) => Promise<Response>,
  ) {
    return async (request: Request, context: { params: Promise<P> }): Promise<Response> => {
      try {
        const refused = checkRequest(request);
        if (refused) throw refused;

        const auth = await deps.requireUser();
        if (!auth.ok) return auth.response;
        if (!canAccess(auth.source, options.access)) {
          throw new ApiError(403, "forbidden", "This credential may not do that.");
        }

        const api = deps.services({ userId: auth.userId, source: auth.source });
        const response = await fn({ api, request, params: await context.params });
        response.headers.set("Cache-Control", "no-store");
        return response;
      } catch (error) {
        return errorToResponse(error);
      }
    };
  };
}
