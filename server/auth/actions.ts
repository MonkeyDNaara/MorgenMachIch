"use server";

import { isValidTimeZone } from "@/lib/date/timeZone";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { services } from "@/server/services";

/**
 * Server Action (#445): stores the browser's time zone right after sign-in,
 * so the server generates recurring occurrences in the user's local days
 * (#312; the first settings save needs a time zone, #405). Best effort: it
 * never blocks signing in, and failures only reach the server log.
 * The auth pages receive it as a prop from their server page, so client
 * code never imports `server/` itself.
 */
export async function saveTimeZone(timeZone: string): Promise<void> {
  if (!isValidTimeZone(timeZone)) return;
  const auth = await requireUser();
  if (!auth.ok) return;
  try {
    await services({ db: getDb(), userId: auth.userId, source: "ui" }).updateSettings({
      timeZone,
    });
  } catch (error) {
    console.error("Saving the time zone failed", error);
  }
}
