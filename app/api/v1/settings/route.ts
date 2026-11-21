import { SettingsPatchBodySchema } from "@/lib/types/api";
import { handle } from "@/server/api/handle";
import { ok, readJson } from "@/server/api/json";

/** `GET /api/v1/settings` (#455): the signed-in user's settings (defaults without a row). */
export const GET = handle({ access: "read" }, async ({ api }) => ok(await api.getSettings()));

/** `PATCH /api/v1/settings`: change `statsSince` and/or `timeZone`; returns the new settings. */
export const PATCH = handle({ access: "write" }, async ({ api, request }) => {
  const patch = SettingsPatchBodySchema.parse(await readJson(request));
  return ok(await api.updateSettings(patch));
});
