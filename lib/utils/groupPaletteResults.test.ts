import { describe, expect, it } from "vitest";
import { groupPaletteResults } from "@/lib/utils/groupPaletteResults";
import { fuzzyMatch, matchWithKeywords, type FuzzyMatch } from "@/lib/utils/fuzzyMatch";

const ORDER = ["Pages", "Actions", "Tasks"];

describe("groupPaletteResults (#195)", () => {
  const items = [
    { id: 1, group: "Tasks", label: "Call dentist" },
    { id: 2, group: "Pages", label: "Calendar" },
    { id: 3, group: "Actions", label: "Create task" },
    { id: 4, group: "Pages", label: "Today" },
    { id: 5, group: "Other", label: "Cal sync" },
  ];
  const run = (query: string) =>
    groupPaletteResults(items, (i) => fuzzyMatch(query, i.label), ORDER);
  const names = (query: string) =>
    run(query).map((g) => `${g.group}:${g.entries.map((e) => e.item.id).join(",")}`);

  it("lists everything in group order for an empty query, unknown groups last", () => {
    expect(names("")).toEqual(["Pages:2,4", "Actions:3", "Tasks:1", "Other:5"]);
  });

  it("drops empty groups and ranks only within a group", () => {
    expect(names("cal")).toEqual(["Pages:2", "Tasks:1", "Other:5"]);
    expect(run("zzz")).toEqual([]);
  });

  it("carries the highlight indices", () => {
    expect(run("tdy")[0].entries[0].indices).toEqual([0, 2, 4]);
  });
});

describe("palette search with a pinned Add row (#197)", () => {
  type Item = {
    id: string;
    group: string;
    label: string;
    keywords?: string[];
    pinned?: boolean;
    rankPenalty?: number;
  };
  const match =
    (query: string) =>
    (item: Item): FuzzyMatch | null => {
      if (item.pinned) return { score: -1_000_000, indices: [] };
      const hit = matchWithKeywords(query, item.label, item.keywords);
      return hit && { ...hit, score: hit.score - (item.rankPenalty ?? 0) };
    };
  const tasks: Item[] = Array.from({ length: 20 }, (_, i) => ({
    id: `t${i}`,
    group: "Tasks",
    label: `Buy milk ${i}`,
  }));
  const items: Item[] = [
    { id: "new", group: "Actions", label: "New task", keywords: ["add"] },
    { id: "add", group: "Actions", label: "Add “buy milk” to backlog", pinned: true },
    { id: "done", group: "Tasks", label: "Buy milk", rankPenalty: 20 },
    { id: "open", group: "Tasks", label: "Buy milk" },
    ...tasks,
  ];

  it("caps each group, lists open above done, and keeps the pinned row", () => {
    const groups = groupPaletteResults(items, match("buy milk"), ORDER, 8);
    expect(groups.map((g) => g.group)).toEqual(["Actions", "Tasks"]);
    expect(groups[0].entries.map((e) => e.item.id)).toEqual(["add"]);
    expect(groups[1].entries).toHaveLength(8);
    expect(groups[1].entries[0].item.id).toBe("open");
    expect(groups[1].entries.some((e) => e.item.id === "done")).toBe(false);
  });

  it("shows the done task when there is room", () => {
    const groups = groupPaletteResults(items.slice(0, 4), match("buy milk"), ORDER, 8);
    expect(groups[1].entries.map((e) => e.item.id)).toEqual(["open", "done"]);
  });

  it("selects the best real match by default, never the pinned row", () => {
    const flat = groupPaletteResults(items, match("buy milk"), ORDER, 8).flatMap((g) => g.entries);
    const best = flat.reduce((a, b) => (b.score > a.score ? b : a));
    expect(best.item.id).toBe("open");
  });

  it("keeps the pinned row last in its group", () => {
    const actions = groupPaletteResults(items, match("new"), ORDER, 8).find(
      (g) => g.group === "Actions",
    )!;
    expect(actions.entries.map((e) => e.item.id)).toEqual(["new", "add"]);
  });
});
