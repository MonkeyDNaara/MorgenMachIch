import { describe, expect, it } from "vitest";
import { BACKUP_STALE_AFTER_DAYS, getBackupNudge } from "@/features/settings/lib/backupNudge";

const NOW = new Date("2026-10-09T10:00:00.000Z");
const daysBefore = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("getBackupNudge (#161)", () => {
  it("nudges when there was never an export, or the timestamp is unreadable", () => {
    expect(getBackupNudge(null, NOW)).toEqual({ kind: "never" });
    expect(getBackupNudge("not a date", NOW)).toEqual({ kind: "never" });
  });

  it("stays quiet for a recent backup", () => {
    expect(getBackupNudge(daysBefore(0), NOW)).toBeNull();
    expect(getBackupNudge(daysBefore(BACKUP_STALE_AFTER_DAYS - 1), NOW)).toBeNull();
  });

  it("turns stale after 30 days and says how long ago", () => {
    expect(BACKUP_STALE_AFTER_DAYS).toBe(30);
    expect(getBackupNudge(daysBefore(30), NOW)).toEqual({ kind: "stale", daysAgo: 30 });
    expect(getBackupNudge(daysBefore(95), NOW)).toEqual({ kind: "stale", daysAgo: 95 });
  });
});
