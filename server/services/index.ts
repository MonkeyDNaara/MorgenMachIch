import "server-only";
import type { ServiceContext } from "@/server/services/context";

export type { RecordSource, ServiceContext } from "@/server/services/context";

/**
 * The server-side service layer (#308): one object per request, with the same function
 * names and arguments as `lib/db`, scoped to `ctx.userId`. Usage in a route (#310):
 *
 *   const s = services({ db: getDb(), userId: session.user.id, source: "ui" });
 *   const tasks = await s.getTasks();
 *
 * Filled by #405 (labels, settings), #406 (tasks), #407 (series) and #408 (backup).
 */
export function services(ctx: ServiceContext) {
  return { ctx };
}

export type Services = ReturnType<typeof services>;
