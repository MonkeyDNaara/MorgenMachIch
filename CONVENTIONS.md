# Project Structure & Conventions

This document describes how the codebase is organized and the naming
conventions used throughout, so new code has an obvious home.

## Folder structure

```
app/
  today/ tasks/ calendar/ labels/ stats/ settings/   # one page.tsx per route
  layout.tsx               # root layout — providers, AppNav, BottomTabBar, FAB, drawers, palette
  globals.css              # DaisyUI themes "morgen" (dark) + "morgen-light", --mm-* tokens, surfaces, type scale
  error.tsx, global-error.tsx, not-found.tsx
components/
  layout/                  # app shell: AppNav, BottomTabBar, PageHeader, EmptyState, ToastProvider, ThemeToggle, ...
  task/                    # tasks & series: TaskCard, TaskList, drawers, toolbar, FilterPopover, ...
  label/                   # LabelChip, LabelsView, ColorSwatchPicker
  quickadd/                # natural-language input: QuickAddInput, highlight layer, chips, autocomplete
  palette/                 # command palette (⌘K)
  stats/                   # /stats: heatmap, bar chart, streak hero, ...
  settings/                # /settings sections
  ui/                      # (reserved for small shared primitives)
lib/
  db/                      # Dexie schema + repository functions (getTasks, createTask, ...)
  types/                   # Zod schemas + inferred types (Task, TaskSeries, Label, AppSettings)
  utils/                   # pure helpers: dates, filters, parser, stats, recurrence, ...
  ui/                      # small UI helpers/hooks: FIELD_FOCUS, FIELD_LABEL, useDismiss, useModKey, theme preference, ...
  constants/               # label palette, priority colors, APP_LOCALE
  commands/                # framework-free command registry for the palette
```

Route pages, the root layout, and most of the folders above are filled in by
later issues (#19–#23) — this issue only establishes the skeleton and the
rules below.

## Naming conventions

- **Component files**: PascalCase, one component per file, default export
  matches the filename (`TaskCard.tsx` exports `TaskCard`).
- **Non-component files** (utils, db, types): camelCase (`dateHelpers.ts`,
  `taskRepository.ts`).
- **Route folders**: lowercase, matching the URL segment (`app/today/`).
- **Imports**: always use the `@/` path alias instead of relative
  `../../../` chains (already configured in `tsconfig.json`), e.g.
  `import { TaskCard } from "@/components/task/TaskCard"`.

## Data layer

`lib/db` is the only place that talks to storage (Dexie/IndexedDB today).
Components and pages never import Dexie directly — they call functions from
`lib/db` (e.g. `getTasks()`, `createTask()`). This keeps the swap to a real
backend later in the course to a change inside `lib/db` only.

## Types

`lib/types` holds the shared domain schemas (Zod) and their inferred types
(`Task`, `TaskSeries`, `Subtask`, `Label`) as a single source of truth,
defined in issue #19. Everything else imports from there rather than
redeclaring shapes locally.
