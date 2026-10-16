import "server-only";
import { eq } from "drizzle-orm";
import { AppSettingsSchema, DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/types";
import { appSettings } from "@/server/db/schema";
import type { ServiceContext } from "@/server/services/context";
import { ValidationError } from "@/server/services/errors";
import { rowToSettings, settingsToRow } from "@/server/services/mappers";

export type SettingsPatch = Partial<Omit<AppSettings, "id">>;

/** Settings services (#405) — the server twin of `lib/db/settings.ts`, one row per user. */
export function settingsServices(ctx: ServiceContext) {
  const { db, userId } = ctx;

  /** Read-only: no row yet (or an invalid one) means the defaults, so a GET never writes. */
  async function getSettings(): Promise<AppSettings> {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
    const result = AppSettingsSchema.safeParse(rowToSettings(row));
    if (!result.success) {
      console.warn("Ignoring invalid settings row", row, result.error);
      return DEFAULT_APP_SETTINGS;
    }
    return result.data;
  }

  /**
   * Creates or updates the row in one statement (upsert). The first save must include the
   * time zone (`time_zone` is `not null`, and #312 generates occurrences in it) — the
   * browser sends it right after sign-in (#309). Keys set to `undefined` are ignored.
   */
  async function updateSettings(patch: SettingsPatch): Promise<AppSettings> {
    const changes = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    const result = AppSettingsSchema.safeParse({ ...(await getSettings()), ...changes, id: "app" });
    if (!result.success) throw new ValidationError("settings", result.error);
    const next = result.data;
    if (!next.timeZone) {
      throw new ValidationError("settings", [
        { path: "timeZone", message: "The first save needs the time zone" },
      ]);
    }
    const row = settingsToRow({ ...next, timeZone: next.timeZone }, userId);
    await db
      .insert(appSettings)
      .values(row)
      .onConflictDoUpdate({
        target: appSettings.userId,
        set: { statsSince: row.statsSince, timeZone: row.timeZone, updatedAt: new Date() },
      });
    return next;
  }

  return { getSettings, updateSettings };
}
