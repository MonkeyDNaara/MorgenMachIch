import { db } from "@/lib/db/db";
import { AppSettingsSchema, DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/types";

/**
 * The single app-settings row (#226). Reads fall back to the defaults when
 * the row is missing (a fresh database, or one created before schema v2)
 * or invalid, so callers never have to handle "no settings yet".
 */
export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get(DEFAULT_APP_SETTINGS.id);
  if (!row) return DEFAULT_APP_SETTINGS;
  const result = AppSettingsSchema.safeParse(row);
  if (!result.success) {
    console.warn("Ignoring invalid settings row", row, result.error);
    return DEFAULT_APP_SETTINGS;
  }
  return result.data;
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, "id">>,
): Promise<AppSettings> {
  const next = AppSettingsSchema.parse({ ...(await getSettings()), ...patch });
  await db.settings.put(next);
  return next;
}
