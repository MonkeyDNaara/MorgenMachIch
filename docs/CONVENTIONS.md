# Project Structure & Conventions

This document describes how the codebase is organized and the naming
conventions used throughout, so new code has an obvious home.

## Folder structure

Feature-based, with shared layers underneath (#373). Code for one feature lives in
one folder; code that several features use lives in a shared layer.

```
app/                       # routes only — pages stay thin and render a feature's view
  (app)/                   # route group: everything inside the app shell
    _components/           # private folder (no route): AppNav, BottomTabBar, navItems, AddTaskFab, TitleCount
    layout.tsx             # providers, shell, drawers, palette, toasts
    today/ tasks/ calendar/ labels/ stats/ settings/ offline/   # one page.tsx per route
  (site)/                  # public pages without the app shell: landing (/), /impressum, /datenschutz
  layout.tsx               # root layout — html/body, fonts, theme script, ThemeSync, service worker
  manifest.ts, icon.svg, favicon.ico, apple-icon.png, opengraph-image.jpg   # icons are generated
  globals.css              # DaisyUI themes, --mm-* tokens, surfaces, type scale
features/                  # one folder per feature (see features/README.md)
  <feature>/
    components/            # React components of this feature
    hooks/                 # React hooks of this feature
    lib/                   # pure logic used only by this feature (+ tests next to it)
    types.ts               # optional: types shared inside the feature
  tasks/ series/ backlog/ today/ calendar/ labels/ quick-add/ command-palette/
  stats/ settings/ dnd/ pwa/ theme/ site/ demo/
components/
  ui/                      # shared UI building blocks: date-field/, EmptyState, PageHeader,
                           # StatusPage, LogoMark, ToastProvider
hooks/                     # shared hooks: useDismiss, useMediaQuery, useModKey, useRadioGroupKeys
lib/
  types/                   # Zod schemas + inferred types — the single source of truth
  db/                      # Dexie repository layer (removed by the hosted-database epic #298)
  domain/                  # framework-free business rules shared by UI, data layer and server:
                           # recurrence, backlog, backup, labelNames, orderKey, groupTasksByDate
  date/                    # generic date helpers: parseDate, parseDateOnly, dateField, monthGrid, ...
  constants/               # label palette, priority colors, APP_LOCALE
  styles/                  # class/style helpers: FIELD_FOCUS, FIELD_LABEL, colorChip
  storage/                 # localStorage flags (storedFlag)
  utils/                   # generic helpers without a better home: urlFlag, isStorageError
  test/                    # test factories
server/                    # server-only code (database client, services) — see server/README.md
assets/brand/              # logo sources (SVG) → `npm run icons`
public/                    # static files; icons/ and site/screens/ are generated, sw.js is git-ignored
scripts/                   # Node scripts: icons, service worker build, screenshots, tests in four time zones
docs/                      # PLANNING.md, CONVENTIONS.md, images/
```

### Layers and import rules

```
app/  →  features/  →  components/ui, hooks/, lib/
                         lib/domain  ←  lib/db, server/
```

- **Shared layers never import features.** `components/`, `hooks/` and `lib/` must not
  import from `features/` or `app/` — enforced by ESLint (`no-restricted-imports`).
- **Client code never imports `server/`** — enforced by the same ESLint rule; server
  modules also start with `import "server-only"`.
- **Features may use other features** where it is a real domain dependency (today and
  calendar render task cards, the palette switches the theme). Keep these few and never
  circular. Logic that two features _and_ the data layer need belongs in `lib/domain`.
- **No barrel files** (`index.ts` that re-exports a folder). Import the file directly:
  `import { TaskCard } from "@/features/tasks/components/card/TaskCard"`. Barrels mix
  client and server modules and defeat tree-shaking in Next.js.
- **Where does new code go?** Used by one feature → that feature. Used by several
  features → `components/ui`, `hooks/` or `lib/`. A business rule the server will need
  → `lib/domain`. A route-only piece → a `_components/` folder next to the route.

## Naming conventions

- **Component files**: PascalCase, one component per file, default export
  matches the filename (`TaskCard.tsx` exports `TaskCard`).
- **Non-component files** (utils, db, types): camelCase (`dateHelpers.ts`,
  `taskRepository.ts`).
- **Route folders**: lowercase, matching the URL segment (`app/(app)/today/`).
- **Feature folders**: kebab-case (`quick-add/`, `command-palette/`).
- **Formatting**: Prettier, see [Formatting](#formatting).
- **Imports**: always use the `@/` path alias instead of relative
  `../../../` chains (already configured in `tsconfig.json`), e.g.
  `import { TaskCard } from "@/features/tasks/components/card/TaskCard"`.
  A test may import the file next to it with `./`.

## Formatting

Prettier formats every file type in the repo (TS/TSX, JS, JSON, CSS, Markdown, YAML) with
`printWidth: 100` (`.prettierrc`; everything else is Prettier's default). It is an exact-pinned
devDependency (#389), so the editor, the scripts and CI use the same version.

- `npm run format` — format everything; `npm run format:check` — check only (CI runs this
  before Lint and fails on any unformatted file)
- VS Code formats on save (`.vscode/settings.json`, Prettier extension recommended in
  `.vscode/extensions.json`)
- Skipped: everything in `.gitignore` (e.g. the generated `public/sw.js`) and `package-lock.json`
  (`.prettierignore`)
- ESLint checks code quality only; `eslint-config-next` has no formatting rules, so the two never
  disagree

## Landing page content

Copy, links, profile and skills of the landing page live in `features/site/lib/content.ts`;
the numbers row ("19 epics, 270+ issues …") in `features/site/lib/stats.ts`. Update the
numbers at every docs sync, rounded down with a "+" so they stay true in between.
Screenshots in `public/site/screens/` and `app/opengraph-image.jpg` are
generated (`npm run screenshots`, see the README) — never edit or replace them
by hand. Change the preview card in `scripts/og-card.html`. Pages don't set
their own `openGraph` object: it would replace the root layout's, image included.

Legal pages (`/impressum`, `/datenschutz`) are German, `noindex` and built on
`features/site/components/LegalPage.tsx`. Name, address and email live only in
`features/site/lib/legal.ts` — nowhere else on the site. Update `PRIVACY_UPDATED` with
every change to the privacy notice.

## Data layer

`lib/db` is the only place that talks to storage (Dexie/IndexedDB today).
Components and pages never import Dexie directly — they call functions from
`lib/db` (e.g. `getTasks()`, `createTask()`). This keeps the swap to a real
backend later in the course to a change inside `lib/db` only.

Every read validates rows with the matching Zod schema from `lib/types` and
skips (with a `console.warn`) any row that fails, so one corrupted row can't
take down a whole list. Every write validates before it hits Dexie. Deleting a
label cascades: it is stripped from every task's and series' `labelIds` before
the label row is removed. Rules the repository needs (recurrence, backlog
order, label names, backup format) come from `lib/domain`, so the server-side
services (#308) can reuse them.

### Server and database (#304)

- `server/db/client.ts` — `getDb()` returns the Drizzle client (postgres.js over the **pooled**
  `DATABASE_URL`, `prepare: false` for Neon's transaction-mode pooler). Created lazily on the first
  query and cached on `globalThis`, so `next build`, CI and hot reloads never open extra connections.
- `server/env/` — `getServerEnv()` validates the server variables with Zod on first use; errors name
  the variable, never its value. Every new server variable goes into `parseServerEnv` and
  `.env.example`.
- `server/db/schema.ts` — our tables (schema `public`). Migrations live in `server/db/migrations/`,
  are generated with `npm run db:generate` and applied with `npm run db:migrate` over the **direct**
  `DATABASE_URL_UNPOOLED`, on the `dev` branch first. Neon Auth's `neon_auth` schema is never
  migrated by us (`schemaFilter: ["public"]`).
- Every module under `server/` starts with `import "server-only"`, except pure helpers that tests
  import (like `parseServerEnv`).

## Types

`lib/types` holds the shared domain schemas (Zod) and their inferred types
(`Task`, `TaskSeries`, `Subtask`, `Label`) as a single source of truth,
defined in issue #19. Everything else imports from there rather than
redeclaring shapes locally.

## Tests

Vitest (#153, set up in #339). Tests live **next to the code they test**
(`features/stats/lib/stats.ts` → `features/stats/lib/stats.test.ts`), import from `vitest`
explicitly (no globals) and use the `@/` alias like the app.

- `npm test` — run once (time zone Europe/Berlin unless `TZ` is set)
- `npm run test:watch` — watch mode while working
- `npm run test:tz` — the whole suite in all four CI time zones
  (Europe/Berlin, America/Los_Angeles, Asia/Kolkata, Pacific/Auckland)
- `npm run test:coverage` — v8 coverage summary (reported, no threshold)

**Time-zone rule:** anything that works with dates builds them from local
parts (`new Date(y, m, d)`), never from `"YYYY-MM-DD"` strings
(`parseDateOnly`) or by adding 24-hour blocks, and pure functions take `now`
as an argument instead of reading the clock. CI runs every test in the four
zones above, so a date bug shows up as a red job.

Pure logic in `lib/` and `features/*/lib/` is tested as plain functions in the default `node`
environment. Component/hook tests opt into jsdom per file with
`// @vitest-environment jsdom`. They use React Testing Library + `user-event`
(`components/ui/date-field/DateField.test.tsx` is the reference): call
`afterEach(cleanup)` (no globals, so no auto-cleanup), fake only `Date`
(`vi.useFakeTimers({ toFake: ["Date"] })`) so user-event's timers still run,
and query by role and accessible name, never by class. Storage (`lib/db`) is not unit-tested: Dexie
is replaced by the hosted database (#298), whose service layer gets its own
tests.
