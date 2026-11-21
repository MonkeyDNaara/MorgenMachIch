import { z } from "zod";
import { AppSettingsSchema } from "@/lib/types";

/**
 * Request bodies of `/api/v1` (#310), built from the domain schemas in `lib/types`.
 * Pure, so the client migration (#314) and the OpenAPI document (#311) share them.
 *
 * Every body schema is `.strict()`: fields the server owns (`id`, `userId`, `source`,
 * timestamps, derived state) are a 422 instead of being silently ignored.
 */

/** `PATCH /api/v1/settings` — any subset of the user's settings. */
export const SettingsPatchBodySchema = AppSettingsSchema.pick({ statsSince: true, timeZone: true })
  .partial()
  .strict();
export type SettingsPatchBody = z.infer<typeof SettingsPatchBodySchema>;
