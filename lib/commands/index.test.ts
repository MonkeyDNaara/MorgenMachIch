import { describe, expect, it, vi } from "vitest";
import { COMMANDS, type CommandContext } from "@/lib/commands";
import { groupPaletteResults } from "@/lib/utils/groupPaletteResults";
import { matchWithKeywords } from "@/lib/utils/fuzzyMatch";

const ORDER = ["Pages", "Actions", "Tasks"];
const search = (query: string) =>
  groupPaletteResults(COMMANDS, (c) => matchWithKeywords(query, c.label, c.keywords), ORDER);
const ids = (query: string) => search(query).flatMap((g) => g.entries.map((e) => e.item.id));

describe("command registry (#196)", () => {
  it("has unique ids", () => {
    expect(new Set(COMMANDS.map((c) => c.id)).size).toBe(COMMANDS.length);
  });

  it("lists pages, then actions, for an empty query", () => {
    expect(ids("")).toEqual([
      "go-today",
      "go-tasks",
      "go-calendar",
      "go-labels",
      "go-stats",
      "go-settings",
      "new-task",
      "theme-system",
      "theme-light",
      "theme-dark",
    ]);
    expect(search("").map((g) => g.group)).toEqual(["Pages", "Actions"]);
  });

  it("finds commands by label and by keyword", () => {
    expect(ids("cal")[0]).toBe("go-calendar");
    expect(ids("new")).toContain("new-task");
    expect(ids("add")).toContain("new-task");
    expect(ids("backup")).toContain("go-settings");
    expect(ids("tags")).toContain("go-labels");
    expect(ids("streak")).toContain("go-stats");
    expect(ids("dark mode")).toContain("theme-dark");
  });

  it("does nothing but call the context", () => {
    const context: CommandContext = { navigate: vi.fn(), openNewTask: vi.fn(), setTheme: vi.fn() };
    for (const command of COMMANDS) command.run(context);
    expect(vi.mocked(context.navigate).mock.calls.map(([path]) => path)).toEqual([
      "/today",
      "/tasks",
      "/calendar",
      "/labels",
      "/stats",
      "/settings",
    ]);
    expect(context.openNewTask).toHaveBeenCalledOnce();
    expect(vi.mocked(context.setTheme).mock.calls.map(([p]) => p)).toEqual([
      "system",
      "light",
      "dark",
    ]);
  });
});
