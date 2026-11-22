import { describe, expect, it, vi } from "vitest";
import { COMMANDS, type CommandContext } from "@/features/command-palette/lib/commands";
import { groupPaletteResults } from "@/features/command-palette/lib/groupPaletteResults";
import { matchWithKeywords } from "@/features/command-palette/lib/fuzzyMatch";

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
      "go-dashboard",
      "go-today",
      "go-tasks",
      "go-calendar",
      "go-labels",
      "go-stats",
      "go-learn",
      "go-settings",
      "go-about",
      "new-task",
      "theme-system",
      "theme-light",
      "theme-dark",
    ]);
    expect(search("").map((g) => g.group)).toEqual(["Pages", "Actions"]);
  });

  it("finds commands by label and by keyword", () => {
    expect(ids("cal")[0]).toBe("go-calendar");
    expect(ids("dash")[0]).toBe("go-dashboard");
    expect(ids("start")).toContain("go-dashboard");
    expect(ids("overdue")).toContain("go-today");
    expect(ids("new")).toContain("new-task");
    expect(ids("add")).toContain("new-task");
    expect(ids("backup")).toContain("go-settings");
    expect(ids("tags")).toContain("go-labels");
    expect(ids("streak")).toContain("go-stats");
    expect(ids("impressum")).toContain("go-about");
    expect(ids("dark mode")).toContain("theme-dark");
  });

  it("does nothing but call the context", () => {
    const context: CommandContext = { navigate: vi.fn(), openNewTask: vi.fn(), setTheme: vi.fn() };
    for (const command of COMMANDS) command.run(context);
    expect(vi.mocked(context.navigate).mock.calls.map(([path]) => path)).toEqual([
      "/dashboard",
      "/today",
      "/tasks",
      "/calendar",
      "/labels",
      "/stats",
      "/learn",
      "/settings",
      "/?landing",
    ]);
    expect(context.openNewTask).toHaveBeenCalledOnce();
    expect(vi.mocked(context.setTheme).mock.calls.map(([p]) => p)).toEqual([
      "system",
      "light",
      "dark",
    ]);
  });

  it("marks Learn as owner only and finds it by keyword (#469)", () => {
    expect(COMMANDS.filter((c) => c.ownerOnly).map((c) => c.id)).toEqual(["go-learn"]);
    expect(ids("quiz")).toContain("go-learn");
  });
});
