import { describe, expect, it } from "vitest";
import { OLD_DONE_DAYS, isOldDone, oldDoneCutoff, splitOldDone } from "@/lib/utils/oldDone";
import { filterTasksByStatus } from "@/lib/utils/filterTasksByStatus";
import { dayKey, localDate, localIso, makeTask } from "@/lib/test/factories";

const done = (completedAt: string | null, overrides = {}) =>
  makeTask({ status: "done", completedAt, ...overrides });

describe("oldDoneCutoff", () => {
  it("is local midnight seven calendar days ago", () => {
    expect(OLD_DONE_DAYS).toBe(7);
    const cutoff = oldDoneCutoff(localDate(2026, 10, 11, 15, 30));
    expect(dayKey(cutoff)).toBe("2026-10-04");
    expect([cutoff.getHours(), cutoff.getMinutes(), cutoff.getSeconds()]).toEqual([0, 0, 0]);
  });
});

describe("isOldDone (#289)", () => {
  it("finished Sun 4 Oct is visible through Sun 11 Oct and hidden from Mon 12 Oct", () => {
    expect(isOldDone(done(localIso(2026, 10, 4)), localDate(2026, 10, 11, 23, 59))).toBe(false);
    expect(isOldDone(done(localIso(2026, 10, 4, 23, 59)), localDate(2026, 10, 11, 0, 1))).toBe(
      false,
    );
    expect(isOldDone(done(localIso(2026, 10, 4)), localDate(2026, 10, 12))).toBe(true);
    expect(isOldDone(done(localIso(2026, 10, 4, 23, 59)), localDate(2026, 10, 12))).toBe(true);
  });

  it("hides the last millisecond before the cutoff", () => {
    const justBefore = new Date(2026, 9, 3, 23, 59, 59, 999).toISOString();
    expect(isOldDone(done(justBefore), localDate(2026, 10, 11, 12))).toBe(true);
  });

  it("keeps done tasks without completedAt, and anything not done, visible", () => {
    const now = localDate(2026, 10, 11);
    expect(isOldDone(done(null), now)).toBe(false);
    expect(isOldDone(makeTask({ status: "open", completedAt: localIso(2020, 1, 1) }), now)).toBe(
      false,
    );
    expect(isOldDone(makeTask({ status: "skipped", completedAt: localIso(2020, 1, 1) }), now)).toBe(
      false,
    );
    expect(isOldDone(done(localIso(2026, 10, 11, 9)), localDate(2026, 10, 11, 10))).toBe(false);
  });

  it("crosses the year end", () => {
    const now = localDate(2027, 1, 7, 8);
    expect(isOldDone(done(localIso(2026, 12, 31)), now)).toBe(false);
    expect(isOldDone(done(localIso(2026, 12, 30, 23)), now)).toBe(true);
  });

  // EU spring/autumn and US spring/autumn DST changes, checked on each of the following days.
  it.each([
    [2026, 3, 29],
    [2026, 3, 8],
    [2026, 10, 25],
    [2026, 11, 1],
  ])("keeps the boundary at midnight around the DST change on %i-%i-%i", (y, m, d) => {
    for (let offset = 0; offset <= 8; offset++) {
      const now = localDate(y, m, d + offset, 0, 30);
      const boundary = localDate(y, m, d + offset - 7);
      const cutoff = oldDoneCutoff(now);
      expect(cutoff.getHours()).toBe(0);
      expect(dayKey(cutoff)).toBe(dayKey(boundary));
      expect(isOldDone(done(boundary.toISOString()), now)).toBe(false);
      expect(isOldDone(done(new Date(boundary.getTime() - 1).toISOString()), now)).toBe(true);
    }
  });
});

describe("splitOldDone", () => {
  const NOW = localDate(2026, 10, 11, 12);
  const list = [
    done(localIso(2026, 9, 1), { id: "a" }),
    makeTask({ id: "b", status: "open" }),
    done(localIso(2026, 10, 10), { id: "c" }),
    done(localIso(2026, 9, 2), { id: "d" }),
    done(null, { id: "e" }),
  ];
  const ids = (tasks: { id: string }[]) => tasks.map((t) => t.id).join("");

  it("splits into recent and old, keeping the order", () => {
    const { recent, old } = splitOldDone(list, NOW);
    expect(ids(recent)).toBe("bce");
    expect(ids(old)).toBe("ad");
    expect(splitOldDone([], NOW).old).toEqual([]);
  });

  it("hides the same tasks under the 'All' and 'Done' status filters", () => {
    expect(splitOldDone(filterTasksByStatus(list, "all"), NOW).old).toHaveLength(2);
    expect(ids(splitOldDone(filterTasksByStatus(list, "done"), NOW).recent)).toBe("ce");
    expect(splitOldDone(filterTasksByStatus(list, "open"), NOW).old).toEqual([]);
  });
});
