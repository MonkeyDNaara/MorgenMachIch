import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";
import type { Database } from "@/server/db/types";
import { ValidationError } from "@/server/services/errors";
import { settingsServices } from "@/server/services/settings";
import { createTestDb, createTestUser } from "@/server/test/db";

let db: Database;
let close: () => Promise<void>;
let me: ReturnType<typeof settingsServices>;
let other: ReturnType<typeof settingsServices>;
const since = new Date(2026, 9, 1).toISOString();

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

beforeEach(async () => {
  me = settingsServices({ db, userId: await createTestUser(db), source: "ui" });
  other = settingsServices({ db, userId: await createTestUser(db), source: "ui" });
});

describe("settings services", () => {
  it("returns the defaults while there is no row", async () => {
    expect(await me.getSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("needs the time zone for the first save", async () => {
    await expect(me.updateSettings({ statsSince: since })).rejects.toMatchObject({
      code: "validation",
      issues: [{ path: "timeZone" }],
    });
    expect(await me.getSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("rejects an unknown time zone", async () => {
    await expect(me.updateSettings({ timeZone: "Mars/Base" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("creates the row, then updates single fields and keeps the rest", async () => {
    expect(await me.updateSettings({ timeZone: "Europe/Berlin" })).toEqual({
      id: "app",
      statsSince: null,
      timeZone: "Europe/Berlin",
    });
    await me.updateSettings({ statsSince: since, timeZone: undefined });
    expect(await me.getSettings()).toEqual({
      id: "app",
      statsSince: since,
      timeZone: "Europe/Berlin",
    });
    await me.updateSettings({ statsSince: null });
    expect(await me.getSettings()).toMatchObject({ statsSince: null, timeZone: "Europe/Berlin" });
  });

  it("keeps users apart", async () => {
    await me.updateSettings({ timeZone: "Europe/Berlin", statsSince: since });
    expect(await other.getSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });
});
