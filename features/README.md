# features/

One folder per feature. Each feature owns its UI, hooks and the logic only it uses:

| Folder             | What it is                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `tasks/`           | task card, drawer, list + toolbar, `/tasks` view; due-date, filter, sort, snooze logic         |
| `series/`          | recurring series: series drawer and row, rule builder, projected occurrences, `OccurrenceSync` |
| `backlog/`         | dateless tasks: "Plan for…" menu, column visibility                                            |
| `today/`           | `/today`: day progress, "Coming up" strip                                                      |
| `dashboard/`       | `/today` briefing: band layout, `DashboardCard`, widgets, collapse state                       |
| `calendar/`        | `/calendar`: month grid, day cells, Backlog tray                                               |
| `labels/`          | `/labels`, label chip, color swatches                                                          |
| `quick-add/`       | natural-language input: parser, highlighting, chips, autocomplete, quick-add bars              |
| `command-palette/` | ⌘K palette, command registry, fuzzy matching                                                   |
| `stats/`           | `/stats`: streaks, heatmap, charts                                                             |
| `settings/`        | `/settings` sections, backup nudge, export download                                            |
| `dnd/`             | drag & drop: handle, move menu, sensors, reorder and reschedule math                           |
| `pwa/`             | service worker (`sw/`), install and update UI                                                  |
| `theme/`           | System / Light / Dark preference                                                               |
| `site/`            | public landing page and legal pages, their content                                             |
| `demo/`            | "Try it with sample data"                                                                      |

Inside a feature: `components/`, `hooks/`, `lib/` (pure, tested next to the file), optional `types.ts`.
Rules for imports between layers are in [docs/CONVENTIONS.md](../docs/CONVENTIONS.md#layers-and-import-rules).
