# Project Structure & Conventions

This document describes how the codebase is organized and the naming
conventions used throughout, so new code has an obvious home.

## Folder structure

```
app/
  today/page.tsx          # /today route
  tasks/page.tsx           # /tasks route
  calendar/page.tsx        # /calendar route
  labels/page.tsx          # /labels route
  settings/page.tsx        # /settings route
  layout.tsx               # root layout — wraps every route in the nav rail shell
  globals.css
components/
  task/                    # task-related UI: TaskCard, TaskDrawer, SubtaskList, ...
  layout/                  # app-shell UI: NavRail, WeekStrip
  ui/                      # small shared primitives: Chip, IconButton, ProgressBar, ...
lib/
  db/                      # Dexie schema + repository functions (getTasks, createTask, ...)
  types/                   # Task, TaskSeries, Subtask, Label type definitions
  utils/                   # date helpers, filter logic, other pure helpers
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
