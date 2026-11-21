import { describe, expect, it } from "vitest";
import { SettingsPatchBodySchema } from "@/lib/types/api";

describe("SettingsPatchBodySchema (#455)", () => {
  it("accepts any subset of the settings", () => {
    expect(SettingsPatchBodySchema.parse({})).toEqual({});
    expect(SettingsPatchBodySchema.parse({ timeZone: "Europe/Berlin" })).toEqual({
      timeZone: "Europe/Berlin",
    });
    expect(SettingsPatchBodySchema.parse({ statsSince: null })).toEqual({ statsSince: null });
  });

  it("refuses fields the server owns and unknown time zones", () => {
    for (const body of [{ source: "claude" }, { id: "app" }, { userId: "x" }]) {
      expect(SettingsPatchBodySchema.safeParse(body).success, JSON.stringify(body)).toBe(false);
    }
    expect(SettingsPatchBodySchema.safeParse({ timeZone: "Mars/Base" }).success).toBe(false);
  });
});
