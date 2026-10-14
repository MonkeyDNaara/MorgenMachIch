import type { Command } from "@/lib/commands/types";
import type { ThemePreference } from "@/lib/ui/themePreference";

export type { Command, CommandContext } from "@/lib/commands/types";

function goTo(id: string, label: string, path: string, keywords: string[]): Command {
  return {
    id,
    label,
    group: "Pages",
    keywords,
    hint: path,
    run: ({ navigate }) => navigate(path),
  };
}

function setTheme(preference: ThemePreference, label: string, keywords: string[]): Command {
  return {
    id: `theme-${preference}`,
    label: `Theme: ${label}`,
    group: "Actions",
    keywords: ["appearance", "color scheme", "mode", ...keywords],
    run: (context) => context.setTheme(preference),
  };
}

/**
 * Every command the app offers (#196), in display order. Plain data with
 * no React or Next imports — see CommandContext for why — so the list
 * can be reused outside the palette and checked without a browser.
 * Icons are a UI concern and are mapped by id in components/palette.
 */
export const COMMANDS: readonly Command[] = [
  goTo("go-today", "Today", "/today", ["home", "start", "overdue", "due"]),
  goTo("go-tasks", "Tasks", "/tasks", ["list", "all", "backlog", "recurring", "series"]),
  goTo("go-calendar", "Calendar", "/calendar", ["month", "schedule", "dates", "plan"]),
  goTo("go-labels", "Labels", "/labels", ["tags", "categories"]),
  goTo("go-stats", "Stats", "/stats", ["streak", "statistics", "progress", "heatmap"]),
  goTo("go-settings", "Settings", "/settings", [
    "backup",
    "export",
    "import",
    "data",
    "preferences",
  ]),
  goTo("go-about", "About MorgenMachIch", "/?landing", [
    "landing",
    "project",
    "developer",
    "author",
    "contact",
    "linkedin",
    "impressum",
    "imprint",
  ]),
  {
    id: "new-task",
    label: "New task",
    group: "Actions",
    keywords: ["add", "create", "todo"],
    run: ({ openNewTask }) => openNewTask(),
  },
  setTheme("system", "System", ["auto", "os", "device"]),
  setTheme("light", "Light", ["light mode", "bright", "day"]),
  setTheme("dark", "Dark", ["dark mode", "night"]),
];
