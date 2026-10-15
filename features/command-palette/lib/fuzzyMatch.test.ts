import { describe, expect, it } from "vitest";
import {
  fuzzyMatch,
  matchWithKeywords,
  rankByQuery,
} from "@/features/command-palette/lib/fuzzyMatch";

const picked = (query: string, text: string) =>
  fuzzyMatch(query, text)
    ?.indices.map((i) => text[i])
    .join("");
const rank = (query: string, items: string[]) =>
  rankByQuery(items, query, (s) => s).map((r) => r.item);

describe("fuzzyMatch (#194)", () => {
  it("finds the letters in order and reports their positions", () => {
    expect(fuzzyMatch("tdy", "Today")?.indices).toEqual([0, 2, 4]);
    expect(fuzzyMatch("xyz", "Today")).toBeNull();
    expect(fuzzyMatch("tsk", "Toggle sidebar skin")).not.toBeNull();
  });

  it("matches everything for an empty query", () => {
    expect(fuzzyMatch("", "anything")).toEqual({ score: 0, indices: [] });
    expect(fuzzyMatch("   ", "anything")).toEqual({ score: 0, indices: [] });
  });

  it("ignores case and spaces in the query", () => {
    expect(fuzzyMatch("TODAY", "today")).not.toBeNull();
    expect(fuzzyMatch("t o d", "Today")).not.toBeNull();
  });

  it("fails when the query is longer or out of order", () => {
    expect(fuzzyMatch("toodayy", "today")).toBeNull();
    expect(fuzzyMatch("yad", "today")).toBeNull();
    expect(fuzzyMatch("ab", "a")).toBeNull();
  });

  it.each([
    ["tsk", "Tasks"],
    ["ncl", "New calendar task"],
    ["cal", "Calendar"],
    ["bl", "Backlog"],
  ])("indices for %j in %j are ascending and spell the query", (query, text) => {
    const result = fuzzyMatch(query, text)!;
    expect(picked(query, text)?.toLowerCase()).toBe(query);
    result.indices.slice(1).forEach((index, i) => expect(index).toBeGreaterThan(result.indices[i]));
  });

  it("gives word starts (camelCase and punctuation) a bonus", () => {
    expect(fuzzyMatch("gt", "goToToday")?.indices[0]).toBe(0);
    expect(fuzzyMatch("tt", "go-to-today")!.score).toBeGreaterThan(
      fuzzyMatch("tt", "gottoday")!.score,
    );
  });

  it("handles umlauts and treats dots literally", () => {
    expect(fuzzyMatch("öl", "Ölwechsel")).not.toBeNull();
    expect(fuzzyMatch("a.b", "a.b")).not.toBeNull();
    expect(fuzzyMatch("a.b", "axb")).toBeNull();
  });
});

describe("rankByQuery", () => {
  it.each([
    ["tsk", ["Toggle sidebar skin", "Tasks"], "Tasks"],
    ["cal", ["Local backup", "Calendar", "Recalculate"], "Calendar"],
    ["new", ["Renew subscription", "New task"], "New task"],
    ["set", ["Reset", "Settings"], "Settings"],
    ["go", ["Go to Today", "Google calendar sync"], "Go to Today"],
    ["tt", ["Tasks Today", "attitude"], "Tasks Today"],
    ["bl", ["Add to backlog", "Blue"], "Blue"],
  ])("%j ranks %j first", (query, items, best) => {
    expect(rank(query, items)[0]).toBe(best);
  });

  it("keeps the original order on ties and for an empty query", () => {
    expect(rank("", ["b", "a", "c"])).toEqual(["b", "a", "c"]);
    expect(rank("a", ["xa", "ya"])).toEqual(["xa", "ya"]);
  });

  it("drops non-matches and keeps item identity", () => {
    const items = [{ t: "Today" }, { t: "Tasks" }, { t: "Labels" }];
    const ranked = rankByQuery(items, "ta", (o) => o.t);
    expect(ranked).toHaveLength(2);
    expect(ranked.map((r) => r.item)).toContain(items[1]);
  });

  it("stays fast on 2000 titles", () => {
    const titles = Array.from(
      { length: 2000 },
      (_, i) => `Task number ${i} with a reasonably long title about topic ${i % 17}`,
    );
    const start = performance.now();
    rankByQuery(titles, "task topic 7", (s) => s);
    rankByQuery(titles, "nmbr lng ttl abt tpc", (s) => s);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe("matchWithKeywords", () => {
  it("prefers a label hit over a keyword hit", () => {
    expect(matchWithKeywords("tasks", "Tasks", [])!.score).toBeGreaterThan(
      matchWithKeywords("tasks", "Today", ["tasks"])!.score,
    );
  });

  it("returns no highlight for a keyword hit, null for no hit, and everything for an empty query", () => {
    expect(matchWithKeywords("add", "New task", ["add"])?.indices).toEqual([]);
    expect(matchWithKeywords("zzz", "Today", ["home"])).toBeNull();
    expect(matchWithKeywords("", "Today", ["home"])).toEqual({ score: 0, indices: [] });
  });
});
