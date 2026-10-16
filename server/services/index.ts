import "server-only";
import type { ServiceContext } from "@/server/services/context";
import { labelServices } from "@/server/services/labels";
import { settingsServices } from "@/server/services/settings";

export type { RecordSource, ServiceContext } from "@/server/services/context";
export type { LabelPatch } from "@/server/services/labels";
export type { SettingsPatch } from "@/server/services/settings";

/**
 * The server-side service layer (#308): one object per request, with the same function
 * names and arguments as `lib/db`, scoped to `ctx.userId`. Usage in a route (#310):
 *
 *   const s = services({ db: getDb(), userId: session.user.id, source: "ui" });
 *   const tasks = await s.getTasks();
 *
 * Labels and settings since #405; tasks (#406), series (#407) and backup (#408) follow.
 */
export function services(ctx: ServiceContext) {
  return { ctx, ...labelServices(ctx), ...settingsServices(ctx) };
}

export type Services = ReturnType<typeof services>;
