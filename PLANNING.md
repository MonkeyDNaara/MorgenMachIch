# MorgenMachIch — Planning

## Decisions so far
- Stack: TypeScript, Next.js (App Router), React, DaisyUI/Tailwind.
- SPA with routed views under a shared layout (persistent nav rail).
- Design direction: dark-first, terminal/dev-tool inspired with Things 3-style tactile warmth. Chosen visual language = "Rounded Tags" palette/shapes (cyan accent, pill tags, circular checkboxes) + nav rail structure from "Two-Tone Split", FAB style from "Rounded Tags", pushed into a layered/3D depth treatment (inset highlights, soft drop shadows, glossy FAB). Locked in the design canvas artifact (Main.dc.html = merged direction).
- UI language: English (job applications outside Germany).
- Persistence: local-only for now (IndexedDB via Dexie.js) behind a repository layer, so it can be swapped for a real backend later in the course without touching UI code.
- Type safety: Zod schemas in `lib/types` are the source of truth; TypeScript types are derived via `z.infer`. The repository layer (`lib/db`) validates every write before it hits Dexie and every read coming back out, skipping (with a warning) any row that fails validation rather than failing the whole list.
- Task notes: basic Markdown.
- Today view: computed filter = due today OR overdue; shows all statuses by default, done tasks struck through in place; additional filters (status/label/priority) layer on top.
- Recurring tasks: TaskSeries (template) + generated Task instances per occurrence, independently completable/skippable. No separate completion-log table — stats derive directly from Task rows. Deleting a series: see the series-deletion decision below (#148).
- Recurring tasks — monthly pattern (added after #21): monthly recurrence needs two modes, both common in calendar apps: a fixed day-of-month (e.g. "the 15th") or an "Nth weekday of month" pattern (e.g. "first Monday", "last Friday"). This will extend `RecurrenceRule` (see Data model below) and gets designed in detail when the Recurring Tasks epic's rule-builder issue comes up — noting it now so it isn't lost.
- Task editing: drawer/modal (`TaskDrawer`), not a dedicated route. Open/closed + create-vs-edit state lives in a `TaskDrawerProvider` React context (mounted in `app/layout.tsx`) so any component can open it without prop-drilling.
- Task drawer FAB: no separate backlog issue for the floating "+" button from the mockup — folded into #25 since the drawer needed a create-trigger anyway.
- Task drawer labels: assigning labels to a task from the drawer was deferred out of #25 into its own future Labels-epic issue ("Add label picker to task drawer", added below), so the picker can reuse the reusable label chip component instead of duplicating chip-rendering logic early.
- Due date/time storage (added for #26): combined into a single ISO datetime string via `new Date(...).toISOString()`, interpreted as local time (single-timezone personal app, no server). All-day tasks store local midnight. Downstream "is this due today" logic (Today/Calendar epics) must convert back to *local* date parts, not UTC, when bucketing by day.
- Task card interaction (added for #29): the status circle and the title/date area are sibling `<button>`s inside a plain wrapper `<div>` (not a button nested inside a button, which is invalid HTML) — the circle toggles `status`/`completedAt` in place via `updateTask()`, the title/date area opens the edit drawer.
- Labels epic scope merge (added for #113): "Build labels management page," "Build label color picker," and "Build reusable label chip component" were 3 separate backlog bullets but are really one deliverable — merged into a single new issue, #113 (the pre-existing placeholder issues #31/#32/#33 from the original backlog seeding got closed as superseded). **Process note:** confirm the actual issue number GitHub assigns right after `gh issue create` runs, rather than assuming the next sequential number — this backlog already had #31-#35 reserved for Labels, so the new issue landed at #113, not #31.
- Label color palette (added for #113): fixed set of 12 curated swatches, generated in OKLCH (L=0.75, C=0.14) spread across the hue wheel for a cohesive family on the dark theme. No free color picker. Defined once in `lib/constants/labelColors.ts`, imported by both the Zod schema (`Label.color` is a `z.enum` over the palette, not `z.string()`) and the swatch-picker UI.
- Label chip style (added for #113): soft-tint pills — background at ~16% opacity, text/border at full swatch color, `rounded-full`, no leading dot. Chosen over solid-filled chips after a side-by-side mockup — reads calmer against the dark theme.
- Label delete UX (added for #113): the delete confirmation surfaces how many tasks the label will be removed from before confirming (`countTasksWithLabel()`), since `deleteLabel()`'s cascade cleanup (#21) shouldn't be a silent side effect.
- FAB visibility (added for #113): the floating "+" (task-create) button only renders on task-related routes (`/today`, `/tasks`, `/calendar`) — it has no purpose on `/labels` or `/settings`.
- Content width (added for #137): the readable-width cap (`max-w-3xl`, centered) lives locally on each page's card/list column (`TaskList.tsx`, `LabelsView.tsx`), not globally on `app/layout.tsx`'s `<main>`. This lets toolbars, filter bars, and the week-ahead strip stretch full width while cards/rows stay narrow and centered underneath them.
- Recurring tasks — rule builder + occurrence engine (added for #58/#60): `RecurrenceRule` implemented as above (Zod `.refine()`s enforce daysOfWeek for weekly, monthlyMode + its matching field for monthly). Pure date-math lives in `lib/utils/recurrence.ts` (`matchesRule`, `occurrencesBetween`, Monday-based week counting). Occurrence generation (`lib/db/occurrences.ts`) tops up a rolling 60-day horizon, re-run idempotently on every app load via `<OccurrenceSync />` in `app/layout.tsx` — no persistent cursor, and deliberately does not backfill missed days from before "now". Repeat is create-only in the task drawer: retrofitting an existing task into a series isn't supported; editing an existing series is its own drawer (#63, below).
- Recurring tasks — pause/resume + /tasks layout (added for #62): `updateTaskSeries(id, { active })` toggles pause/resume from a new `SeriesRow` component. To keep a single active series from flooding /tasks with dozens of daily/weekly occurrences, /tasks was split into two side-by-side columns sharing one filter toolbar: a Tasks column (single, non-series tasks) and a Recurring column (one row per TaskSeries, via a new `formatRecurrenceRule()` plain-English summary). Status/sort filters apply only to the Tasks column; priority/label filters apply to both (`filterSeriesByPriority`/`filterSeriesByLabels` mirror the existing task filters). `TaskCardList` was extracted as a pure list renderer so `TaskList` (Today/Calendar) and the new `TasksView` (/tasks) can share rendering without duplicating markup.
- Recurring tasks — series editing (added for #63): editing is template-only (no "this occurrence vs. all future" split). A separate edit-only drawer (`SeriesDrawerProvider` / `SeriesDrawer` / `SeriesDrawerPanel`, mirroring the task drawer) opens from the `SeriesRow` title area; the pause/resume icon stays its own quick action. Editable: title, priority, notes, labels, subtask template, time of day / all-day, and the full recurrence rule via `RecurrenceRuleBuilder`. The anchor start date is locked (shown read-only) so the recurrence pattern never shifts; only `startDate`'s time-of-day component changes. Because `generateOccurrences()` only adds missing dates and never touches existing rows, `updateTaskSeriesAndRegenerate()` (`lib/db/taskSeries.ts`) updates the template, deletes the series' `open` occurrences due today-or-later, then refills them. Completed and skipped occurrences are never touched. Known trade-offs: subtasks already checked off on an open today-or-later occurrence reset on edit, and editing a paused series removes its upcoming open occurrences until it is resumed.
- Recurring tasks — series deletion (added for #148): a red "Delete series" button in the series edit drawer footer opens an inline choice panel with live counts (`countSeriesOccurrences()`): (1) delete the series + its upcoming open occurrences (`deleteTaskSeriesAndUpcoming()`, open and due today-or-later, the same boundary as #63's regeneration), (2) delete only the series and keep every occurrence as a standalone task (`deleteTaskSeriesKeepingTasks()`), or (3) delete the series + every occurrence including completed history (`deleteTaskSeriesAndOccurrences()`, irreversible — this also erases data the Stats epic would count, so it is an explicit third choice, never the default). Kept occurrences are detached (`seriesId = null`) so they show in /tasks' Tasks column as normal tasks instead of becoming hidden orphans (that column excludes every task that still carries a `seriesId`). Completed, skipped and overdue occurrences are kept by options 1 and 2. The original `deleteTaskSeries()` was replaced by these functions since nothing called it. Deleting a single occurrence from the task drawer doesn't stick — `generateOccurrences()` would recreate the missing date on the next load — so for tasks with a `seriesId` the drawer shows a hint (use Skip, or delete the series) instead of a Delete button. A per-occurrence "tombstone" (remember deleted dates on the series) was considered and deferred as its own future issue if ever wanted.
- Settings — backup, restore & danger zone (added for #161/#162/#163): `/settings` is a server component (`SettingsView`) composing client sections: Data (`DataSection`), Import (`ImportSection`), Danger zone (`DangerZoneSection`) and About (`AboutCard`, reads the version from `package.json` on the server so the file never ships to the client). Export is a versioned JSON envelope `{ app: "morgenmachich", version: 1, exportedAt, data: { tasks, taskSeries, labels } }` (`lib/utils/backup.ts`, read in one Dexie read transaction by `exportAll()` in `lib/db/backup.ts`). Import is **replace-everything**, never a merge: `parseBackup()` is a pure, all-or-nothing validator (JSON → envelope/app/version check → Zod validation of every row with unique ids → referential checks: task→series/label, series→label; errors are capped at 20 plus "…and N more"), the UI shows a preview comparing the file's counts with the current data, and only after an explicit confirm does `importAll()` clear and refill all three tables in a single transaction (a failure rolls back untouched), then best-effort runs `generateOccurrences()`. Before replacing, a safety backup of the current data is auto-downloaded (skipped when the app is empty). "Delete all data" (`deleteAllData()`, single-transaction clear of all three tables) is an inline confirm panel with live counts and an export nudge, disabled when there is nothing to delete. Last-backup timestamp lives in localStorage (`morgenmachich:lastExportedAt`), read through `useSyncExternalStore` (`lib/ui/lastExported.ts`, custom change event + `storage` event) so it is hydration-safe; the nudge (`getBackupNudge()` in `lib/utils/backupNudge.ts`, pure) turns "stale" after 30 days. Theme switching stays deferred (#90): the app ships one dark `morgen` DaisyUI theme.
- Calendar — projected (ghost) occurrences (added for #168): recurring occurrences were already visible on /calendar because they are real Task rows, but rows only exist ~60 days ahead (`GENERATION_HORIZON_DAYS`), so browsing further out made an active series look like it ended. The calendar now also shows read-only, dimmed "ghost" entries computed on the fly by the pure `projectSeriesOccurrences()` (`lib/utils/projectOccurrences.ts`) instead of generating real rows while browsing — a view must never write to the DB. Rules: only active series project; only today-or-later (no backfill, same as the generator); dedupe runs against every real row of the series including skipped/done ones, so a skipped occurrence never reappears as a ghost; start date and `endDate` come from `occurrencesBetween`. `CalendarDayCell` takes a small `CalendarEntry` view-model (`lib/utils/calendarEntries.ts`) rather than `Task`, so real tasks and ghosts render identically (recurring entries get a `Repeat` icon, ghosts are dimmed); the day drill-down lists a day's ghosts in a read-only "Projected" section (`ProjectedOccurrenceList`). `groupTasksByDate` became generic, and the due-date construction is shared via `occurrenceDueIso()` (`lib/utils/recurrence.ts`) so the generator and the projection agree on time of day.
- Calendar — label + priority filters (done, #171, merged as PR #176): `CalendarView` owns the label (multi, OR) and priority (single) filter state and renders one filter bar above both the month grid and the day drill-down, so there is a single source of truth; filters apply to real tasks and projected ghosts alike (ghosts and `CalendarEntry` carry `labelIds`). `filterTasksByLabels`/`filterTasksByPriority` became generic over anything with `labelIds`/`priority`, and `PriorityFilterSelect` was extracted from `TaskListToolbar` so the options exist once. The day view passes the filters to `TaskList` via `baseFilter`, and `TaskList` got a `hideLabelAndPriorityFilters` prop (and the toolbar a `hidePriority` prop) to hide its own controls there; status and sort stay. Filters are plain state and reset on reload, like the other filters; the label bar's Clear resets labels only and priority resets via "All priorities", matching /tasks.
- Backlog epic (done, epic #185; #182 + #183 + #184): a task with no `dueDate` **is** a backlog task — no new status or flag, no schema change, so old backups stay valid. `isBacklogTask()` (`lib/utils/backlog.ts`, pure) is `status === "open" && dueDate === null && seriesId === null`; done/skipped dateless tasks are history, not backlog, and stay in the Tasks column. **Placement:** a third column on `/tasks` (decided: widen rather than hide it in a tab). The grid is `3fr | 1px | 2fr` for Tasks/Recurring and gains a third `2fr` Backlog column at `lg` (page cap widens from `max-w-5xl` to `max-w-7xl` only while the Backlog is shown); at `md` the Backlog drops below as a full-width row, on small screens everything stacks. A pill toggle above the grid ("Backlog · N") hides/shows the column; the choice persists in localStorage (`morgenmachich:backlogVisible`, `lib/ui/backlogVisible.ts`, read through `useSyncExternalStore` like the last-export timestamp so it is hydration-safe, default visible). **Order:** priority (high first), then oldest first, so nothing rots at the bottom (`sortBacklogTasks`); each card shows an age marker instead of a due date ("added today", "3d ago" … via `formatTaskAge`, which counts local calendar days). Label and priority filters narrow the Backlog like the other columns; the status filter and sort apply only to the Tasks column. **Plan for… (#183):** a calendar-plus icon on backlog cards opens `PlanForMenu` with Today, Tomorrow, the remaining days up to this Sunday (`planDateOptions()` reuses `upcomingWeekDays`, so "rest of the week" means the same as in the week-ahead strip; empty beyond Today/Tomorrow on Saturday/Sunday) and a native date picker (past dates disabled). Planning sets an all-day due date (local midnight, `planDueDateIso`), which by itself moves the task out of the Backlog — there is no separate "planned" state, and clearing the date in the drawer sends it back. The menu is plain React state (closes on Escape / outside click) rather than daisyUI's focus-based dropdown, which would close the moment the date picker takes focus. **Quick add (#184):** an inline "Add to backlog…" input at the top of the column; Enter creates a title-only open task (priority none, no labels) and keeps focus for adding several in a row, Escape clears, blank titles are ignored, a failed save keeps the typed text and shows an inline error. If the active label/priority filters would hide the new task, a short note says so instead of letting it look like the add failed. **Consistency check (the open point from planning):** dateless tasks deliberately appear only in the Backlog on `/tasks` — `/today` (`isTodayOrOverdue`), the week-ahead strip, the calendar (`groupTasksByDate` skips them), day drill-downs and the Overdue filter all require a `dueDate`, so a backlog task can never show as overdue or clutter the date-based views. **Locale:** the Plan menu originally forced `en-US` while the rest of the app used the browser locale, so a German browser mixed German weekdays into the English UI; this was unified by the shared `APP_LOCALE` (#191, below).
- Shared app locale (done, #191, PR #193): `APP_LOCALE = "en-GB"` in `lib/constants/locale.ts` (English month/weekday names, day-before-month, 24-hour time). Every `toLocale*String` / `Intl` call passes it — never `undefined` (browser locale) and never a hardcoded locale string. Reason: the UI is English-only, and a German browser mixed German weekdays and months into it. Following the browser language instead would have meant translating the whole UI (a separate i18n feature), so it was rejected. Side effect: server and client now render identical date strings, which removes a class of hydration mismatches. Accepted quirk: en-GB abbreviates September as "Sept".
- Command Palette epic (done, epic #9; #194 + #195 + #196 + #197, PRs #198–#201): built from scratch, no `cmdk` or similar library, because the matching, keyboard handling and accessibility are the interesting parts to show in a portfolio. Files: `components/palette/` (`CommandPaletteProvider`, `CommandPalette`, `usePaletteItems`, `HighlightedText`, `commandIcons.ts`, `types.ts`), `lib/commands/` (`index.ts`, `types.ts`), `lib/utils/fuzzyMatch.ts`, `lib/utils/groupPaletteResults.ts`. **Fuzzy match (#194):** finds the best in-order alignment of the query in the text with dynamic programming, O(text × query). Bonuses: consecutive character +5, word start +4 (including camelCase and after punctuation), first character +3. Penalties: each skipped letter 0.5 (raised from 0.2 after "Toggle sidebar skin" outranked "Tasks" for "tsk"), each leading character 0.1, text length 0.01 per character. `rankByMatcher` is the general ranker, `rankByQuery` the plain-label version; `matchWithKeywords` matches the label first and falls back to keywords at −50 with no highlight. **Shell (#195):** native `<dialog>` opened with `showModal()`, which gives focus trap, inert page, Escape to close and focus restore for free. Placed in the upper third (`mt-[15vh]`, max 560px wide); a mousedown on the backdrop closes it; the body is only mounted while open, so state resets on every open. Cmd+K / Ctrl+K toggles it on every route, also while typing in an input (`preventDefault` beats the browser's own Ctrl+K). A search button sits in the nav rail above Settings. Combobox/listbox ARIA with `aria-activedescendant` and a polite live region for the result count. Results are grouped in a fixed order Pages → Actions → Tasks; ranking only happens within a group. **Commands (#196):** the registry is framework-free data (`id, label, group, keywords, hint, run(context)`); a `CommandContext` supplies `navigate` and `openNewTask`, so `lib/commands` imports nothing from React or Next and can later be reused by natural-language quick-add or a second-brain API. Icons are mapped by command id in the UI layer (`commandIcons.ts`). Commands: go to each page, New task. **Task search (#197):** tasks are listed only once the query is non-empty; recurring occurrences and skipped tasks are excluded (the series row is the meaningful unit, and occurrences would flood the list); done tasks are shown muted with a −20 score; max 8 rows per group. Enter opens the task drawer; Cmd/Ctrl+Enter toggles done and keeps the palette open (selection is tracked by id, so it follows the row when its rank changes). A pinned "Add “…” to backlog" row (score −1,000,000, always last in Actions) creates a dateless task and shows a 3-second toast (`notify` in the provider). The default selection is the best score overall but never the pinned row, so typing an existing title opens that task instead of creating a duplicate. The footer shows ⌘ on Mac and Ctrl elsewhere (detected in the client-only body, so no hydration mismatch).
- Future direction — Neon (added after #168): the local-only IndexedDB persistence is planned to move to Neon (hosted Postgres) so tasks can also be added from a phone. The `lib/db` repository layer is the swap point; it will need an API layer and authentication, and the versioned backup format (`lib/utils/backup.ts`) is the natural migration path. Not scheduled; decide scope when picked up.
- Future direction — second brain (added after #168): the app is meant to become part of a "second brain" built with Claude and Obsidian, where Claude helps manage and work on tasks, so the app will eventually need an interface/API for that. Design unknown for now; until then keep domain logic in pure functions (`lib/utils`) and keep data formats versioned so an API/agent interface can reuse them.
- Deployment & Ops — error pages (done, #177): `app/not-found.tsx` (terminal-style 404 with "Back to Today"), `app/error.tsx` (client boundary: friendly message, "Try again" via `reset`, "Go to Today", collapsed "Technical details" with message/digest, `console.error` in an effect) and `app/global-error.tsx` (fallback for root-layout failures; replaces the root layout, so it renders its own `<html>`/`<body>`, imports `globals.css`, and uses a plain `<a>` instead of `next/link` because a full page load is the safest exit when routing itself broke). All three share `StatusPage` (`components/layout/StatusPage.tsx`: large mono code in the accent color, title, one sentence, actions). `isStorageError()` (`lib/utils/isStorageError.ts`, pure) recognises Dexie/IndexedDB failures (`OpenFailedError`, `DatabaseClosedError`, `MissingAPIError`, `QuotaExceededError`, `SecurityError`, `InvalidStateError`, `VersionError`, or an "IndexedDB" mention in the message) so a blocked-storage case (e.g. a private window) gets a targeted hint instead of a generic message — the one runtime failure this local-first app can realistically hit.
- Deployment & Ops — CI (done, #178): `.github/workflows/ci.yml` runs on every pull request and on pushes to `main`: Node 22 with the npm cache, `npm ci`, `npx next typegen`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, with a read-only token (`contents: read`), a 10-minute timeout, and concurrency that cancels superseded runs. It does not deploy — Render auto-deploys from `main`. The first run failed and caught a real gap: Next 16's global route types (`LayoutProps`, `PageProps`) are generated into the gitignored `.next/types`, so on a fresh checkout `tsc` failed with `Cannot find name 'LayoutProps'` (locally the folder exists after `next dev`). The fix is the `next typegen` step before the typecheck. A CI status badge is in the README. Making the check *required* is a repo setting (branch ruleset), not code; it was left optional. The same workflow will run Vitest once that epic lands.
- Deployment & Ops — Render verification (checked 2026-10-07 via the Render connector, read-only): service `morgen-mach-ich` is a Node web service on the free plan (Oregon) built from `MonkeyDNaara/MorgenMachIch`, auto-deploy on commit for `main`, build `npm ci && npm run build`, start `npm run start` — matching `render.yaml`. Every merge to `main` deploys in about 75 seconds. No health-check path is configured. Free-tier spin-down (idle service sleeps and needs a few seconds to wake) was **accepted**: the README keeps its note, no keep-alive ping; revisit (e.g. a paid plan) if daily use makes it annoying. Because data lives in IndexedDB, the deployed app starts empty on each device/browser — Settings export/import is the way to move data until the Neon epic exists.
- Migration path — Dexie to a hosted API (written for Deployment & Ops, informs the Neon and Second Brain epics): the seam is already clean. Components and pages never import Dexie or `db`; everything goes through the async functions in `lib/db` (`tasks.ts`, `taskSeries.ts`, `labels.ts`, `occurrences.ts`, `backup.ts`), validated with the Zod schemas in `lib/types`. A hosted implementation (Neon/Postgres behind an API) should keep those function signatures and the Zod validation at the boundary. Things that will need real decisions: (1) the one UI-side Dexie coupling is `useLiveQuery` from `dexie-react-hooks`, used in 10 components (`LabelsView`, `DangerZoneSection`, `DataSection`, `ImportSection`, `CalendarView`, `SeriesDrawerPanel`, `TaskDrawerPanel`, `TaskList`, `TasksView`, `WeekAheadStrip`) — it gives live updates for free and would be replaced by a fetch/revalidate layer (or a subscription); (2) the Dexie transactions in `importAll`, `deleteAllData`, `exportAll` and `updateTaskSeriesAndRegenerate` need real database transactions; (3) `generateOccurrences()` runs in the browser on every app load, which is safe with one local database but would create duplicates if two devices ran it against one shared database — it needs a unique constraint on (series, date) or a server-side job; (4) last-export timestamp is per-browser localStorage by design; (5) authentication is required before anything is exposed, and the same API would double as the interface for the second-brain integration; (6) existing local data moves over via the versioned backup format (`parseBackup`/`importAll`).
- Testing (added 2026-09-14): Vitest, added at the end of development rather than test-driven alongside each epic — once the feature set is stable, write tests for the parts that most benefit from them (pure date-math/recurrence logic, the `lib/db` repository layer, filter/sort utilities), not a blanket coverage target. Exact scope gets nailed down when that epic is picked up.
- Deployment target: Render (Node Web Service, not Vercel).
- Milestones: no v1/v1.1 split — single flat backlog.

## Route map
- `/today` — today + overdue tasks (default landing view)
- `/tasks` — full card-view list, all tasks
- `/calendar` — month view with due dates
- `/labels` — manage labels
- `/settings` — data export/import (JSON backup), delete-all-data danger zone, about/version
- Task detail/edit — drawer/modal, not a route

## Data model (TypeScript)

```ts
type Priority = 'none' | 'low' | 'medium' | 'high';
type TaskStatus = 'open' | 'done' | 'skipped';

type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];       // 0=Sun..6=Sat, required for weekly
  monthlyMode?: 'dayOfMonth' | 'nthWeekday'; // required for monthly
  dayOfMonth?: number;         // 1-31, for monthlyMode: 'dayOfMonth'
  nthWeekday?: { n: number; weekday: number }; // n: 1-4 or -1 (last)
  endDate?: string | null;
};

type Subtask = { id: string; title: string; done: boolean };

type Task = {
  id: string;
  title: string;
  notes?: string;             // Markdown
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;     // ISO datetime
  allDay: boolean;
  labelIds: string[];
  subtasks: Subtask[];
  seriesId: string | null;    // set if generated from a recurring series
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type TaskSeries = {
  id: string;
  title: string;
  notes?: string;
  priority: Priority;
  labelIds: string[];
  subtaskTemplate: { title: string }[];
  recurrence: RecurrenceRule;
  startDate: string;
  active: boolean;             // pause without deleting
  createdAt: string;
  updatedAt: string;
};

type Label = { id: string; name: string; color: string; createdAt: string };
```

Implemented as Zod schemas in `lib/types/index.ts` (issue #19), with `New*`
input variants (`NewTask`, `NewTaskSeries`, `NewLabel`) that omit
repository-generated fields (id, timestamps, derived state) for use when
creating records.

## Feature scope (all confirmed in-scope, no priority tiers)
Task CRUD, card-view list, calendar view, labels + filtering, priority levels, subtasks with progress bar, recurring tasks (independent occurrences), command palette (⌘K), natural-language quick-add, drag & drop, streak/stats, PWA installability, public landing page, settings (data export/import). Backlog (dateless tasks) and the command palette are done. Planned later: light theme, Neon-hosted database (phone access), second-brain (Claude + Obsidian) integration.

## GitHub issue backlog (flat, no milestones)

### Epic: Foundations & Project Setup — done
- Set up project folder structure and conventions (app router, components, lib, types)
- Configure Tailwind + DaisyUI with the approved dark theme tokens (colors, radii, shadows)
- Define core TypeScript types (Task, TaskSeries, Subtask, Label)
- Set up Dexie.js local database schema
- Build data repository layer (CRUD for tasks, labels, series)
- Build app shell layout (nav rail + routed content area)
- Set up route skeleton: /today, /tasks, /calendar, /labels, /settings
- Initial deploy to Render (get a live URL early)

### Epic: Task CRUD — done
- Build task drawer/modal component (shared create + edit form) — done, includes the FAB
- Implement create task (validation, save to DB)
- Implement edit task (prefill drawer, save changes)
- Implement delete task (with confirmation)
- Implement complete/incomplete toggle
- Build task card component (title, due date/time, priority indicator, label chips, subtask progress bar)

### Epic: Labels — done
- Build labels page: list/create/edit/delete, with the reusable label chip component and the 12-swatch color picker built as part of it — done (#113, superseded placeholders #31/#32/#33)
- Add label picker to task drawer — done (#116)
- Display label chips on task card — done (#118, added after #30 deferred it)
- Label-based filtering: shared utility + filter bar on /tasks — done (#120, merged the original "filtering logic" and "filter UI" bullets; /today reuses these once the Today View epic builds that page)

### Epic: List View (/tasks) — done
- Build full task list page (card view, all tasks) — done early (interim TaskList/TaskCard built during Task CRUD, #25-#30) rather than as a separate step here
- Build empty state — done early, same as above
- Sorting + status filter — done (#123, merged; due date/created only — priority dropped until the Priority epic ships a selector; status filter is All/Open/Overdue/Done — "Skipped" swapped for the derived "Overdue" since nothing sets skipped yet)

### Epic: Today View (/today) — done
- Today/overdue core view — done (#126; extended TaskList with baseFilter + emptyMessage props so /today reuses it directly, scoped to tasks due today (any status, done ones struck through) or overdue-and-not-done; same status/label filters and sorting as /tasks come along for free)
- Week-ahead strip — done (#130; "Coming up" section below the list, one column per day from tomorrow through Sunday, hidden past Sunday and on days with no open tasks, capped at 3 tasks + overflow; clicking a day drills the list into that date with a "Back to Today" control; introduced a priority-dot component reusing the label-palette green/yellow-green + the existing overdue red — the theme's warning/error slots stay reserved for the Priority epic's own design pass, #7)

### Epic: Subtasks — done
- Subtask editor in task drawer: add/edit/remove/reorder (plain up/down arrows, not drag-and-drop — that's the Drag & Drop epic) and a done/undone checkbox per row — done (#133)
- Subtask progress bar on task card: thin fill bar + "done/total" fraction together, capped at 192px width; hidden entirely when a task has no subtasks — done (#134)

### Epic: Priority — done
- Priority selector in task drawer (None/Low/Medium/High, single-select chip row reusing the label-chip toggle interaction) and a colored dot indicator on the task card (no dot for None; green/yellow-green/red for Low/Medium/High, matching the week-ahead-strip dot introduced in #130) — done (#138; also factored the label chip's soft-tint style into a shared `tintChipStyle()` helper so `LabelChip` and the new `PriorityChip` don't duplicate the styling logic)
- Priority filter dropdown in the /tasks toolbar (All priorities/High/Medium/Low/None), same filter chain pattern as status and labels — done (#140)

### Epic: Calendar View (/calendar) — done except optional week view (#145, #168, #171)
- Month grid (Mon-Sun weeks, dynamic 4-6 rows) with prev/next navigation and a "Today" reset — done (#145)
- Tasks plotted per day as a compact mini-list (PriorityDot + truncated title, capped at 3 + "+N" overflow), same idiom as the week-ahead strip's day columns — done (#145)
- Day click drills into the shared TaskList scoped to that date (any status), reusing TodayView's selectedDay/baseFilter pattern, with a "Back to month" control — done (#145)
- Render recurring occurrences correctly — done (#168): real rows already rendered; read-only projected "ghost" occurrences added beyond the 60-day horizon, repeat icon on recurring entries, "Projected" list in the day drill-down
- Add label + priority filters to the calendar month grid — done (#171): one filter bar above grid and day view, applies to ghosts too
- (Stretch, not yet scoped) week view toggle — separate issue once we've used the month view for a while

### Epic: Recurring Tasks — done
- Build recurrence rule builder UI (frequency + interval; weekly: day-of-week multi-select; monthly: choice of a fixed day-of-month **or** an "Nth weekday of month" pattern like "first Monday"; end date) — done (#58)
- Build occurrence-generation engine (lazily materialize upcoming Task rows, 60-day rolling horizon on app load), including monthly day-of-month/Nth-weekday math (e.g. months without a 31st) — done (#60)
- Implement TaskSeries repository (create/edit/delete/pause) — base CRUD done in #21 (`lib/db/taskSeries.ts`); pause/resume done (#62); edit-with-regeneration done (#63); delete done (#148)
- Implement independent complete/skip per occurrence — done (#61): skip icon-button on occurrence cards (recurring + still open only); skipped tasks hidden by default from Today/Calendar/tasks, excluded from the Overdue filter, auditable via a new "Skipped" status filter on /tasks
- Implement pause/resume series and split /tasks into a Tasks/Recurring two-column layout (one row per series) — done (#62)
- Handle editing a series — done (#63): template-only edit semantics (no split-off); edit drawer opened from the series row, saving regenerates open today-or-later occurrences
- Handle deleting a series — done (#148): delete button in the series drawer with a three-way choice (series + upcoming open tasks / series only, keep tasks / series + everything); kept tasks are detached; recurring occurrences can't be deleted individually from the task drawer (Skip instead)

### Epic: Command Palette — done (epic #9: #194, #195, #196, #197; old placeholders #64–#67 closed as not planned)
- Fuzzy-match utility (DP alignment, bonuses/penalties, keyword fallback) — done (#194, PR #198)
- Palette shell: native `<dialog>`, Cmd/Ctrl+K on every route, nav-rail button, combobox ARIA, grouped results with keyboard navigation — done (#195, PR #199)
- Command registry (framework-free) with page navigation and New task — done (#196, PR #200)
- Task search, Cmd/Ctrl+Enter to complete, pinned "Add to backlog" row with toast — done (#197, PR #201)

### Epic: Natural-language Quick-Add
- Integrate a date/time parsing library (e.g. chrono-node)
- Parse free text into title + due date/time
- Fallback to manual fields when parsing is ambiguous
- Wire into command palette and main add button

### Epic: Drag & Drop
- Implement drag-to-reorder within a task list
- Implement drag-and-drop rescheduling on the calendar
- Persist new order/date on drop

### Epic: Stats & Streaks
- Compute daily/weekly completion counts from Task rows
- Compute current streak and best streak
- Build a small stats widget
- Decide where stats are shown (today view header vs. settings)

### Epic: PWA
- Add web app manifest + icons
- Add service worker for offline caching
- Test install prompt on mobile & desktop

### Epic: Public Landing Page
- Build marketing one-pager (hero, feature highlights, tech stack, screenshots)
- Add "Launch App" CTA into /today
- Make it responsive
- Add basic SEO meta tags

### Epic: Settings — done (light theme moved to its own epic, #90)
- Build settings page skeleton — done (#161, with export)
- Implement data export (JSON download) — done (#161): versioned envelope, last-backup timestamp + 30-day nudge
- Implement data import (JSON upload + validation) — done (#162): all-or-nothing validation, preview + confirm, replace-everything in one transaction, safety backup before replacing
- Delete all data (danger zone) + About card — done (#163)
- (Deferred) light theme toggle placeholder (#90) — stays deferred; now planned as its own epic (Light Theme, below)

### Epic: Backlog (tasks without a due date) — done (epic #185: #182, #183, #184)
- Make "no due date" a first-class, visible concept: backlog tasks (`dueDate === null`) in their own hideable/showable third column on `/tasks`, sorted by priority then oldest first, with an age marker and persisted visibility — done (#182)
- "Plan for…" menu to promote a backlog task to a due task (today / tomorrow / rest of this week / pick a date) — done (#183)
- Inline quick-add input in the Backlog column — done (#184)
- Decide placement relative to the existing /tasks Tasks/Recurring columns — done: third column (md: full-width row below, small screens: stacked)
- Check that Today/Calendar/filters treat dateless tasks consistently — done: they only appear in the Backlog on `/tasks`; every date-based view requires a due date

### Follow-up: shared app locale — done (#191, PR #193)
- All date/weekday formatting uses one shared `APP_LOCALE` constant (`lib/constants/locale.ts`) — done
- Decided: English everywhere (`en-GB`), not the browser language (that would need a full i18n feature)

### Epic: Light Theme (formerly deferred #90)
- Define a light DaisyUI theme alongside the dark `morgen` theme
- Theme toggle in Settings with persistence (`data-theme` on `<html>`)
- Design pass across all components
- (Planned as its own epic; see Settings epic's deferred item #90)

### Epic: Neon Database & Sync (future)
- Decide API layer + authentication for a hosted database
- Migrate `lib/db` from Dexie to Neon (Postgres) behind the existing repository interface
- Migration path for existing local data (versioned backup import)
- Add tasks from the phone

### Epic: Second Brain Integration (future — Claude + Obsidian)
- Explore how Claude/Obsidian should read and work on tasks (API/agent interface)
- Needs the Neon epic's API first; design open

### Epic: Testing (Vitest) — deferred to end of development
- Set up Vitest (+ fake-indexeddb for Dexie) in the project, and add a test step to the CI workflow (#178)
- Unit tests for pure utilities: recurrence date-math (`lib/utils/recurrence.ts`), filter/sort functions, date helpers (`isDueToday`, `formatDueDate`), and the backup validator (`parseBackup()` in `lib/utils/backup.ts`, `getBackupNudge()` — already exercised with ~20 ad-hoc cases during #162, a good seed) plus `projectSeriesOccurrences()` (9 scratch cases during #168) and `isStorageError()` (8 scratch cases during #177), and the command palette's pure logic: `fuzzyMatch`/`rankByQuery`/`matchWithKeywords` (~35 scratch assertions during #194), the command registry (#196) and `groupPaletteResults` (#195/#197)
- Tests for the `lib/db` repository layer (CRUD + validation behavior)
- (Maybe) component tests for the trickiest UI logic (e.g. TaskDrawerPanel's conditional validation)

### Epic: Deployment & Ops — done
- Set up Render Web Service for the Next.js app — done (initial deploy in Foundations; verified 2026-10-07)
- Configure build/start commands and environment variables — done (`render.yaml` Blueprint: `npm ci && npm run build`, `npm run start`, Node 22.11)
- Set up auto-deploy from main branch — done and verified: auto-deploy on commit, every merge to `main` goes live in about 75 seconds
- Add error boundary / 404 page — done (#177): `not-found.tsx`, `error.tsx`, `global-error.tsx`, storage-error hint
- Add CI (typecheck, lint, build on every PR) — done (#178): GitHub Actions workflow + README badge; catches missing route types via `next typegen`
- Note migration path from Dexie to a real API layer for when the backend arrives — done: see the "Migration path" decision above
- Free-tier spin-down — accepted, README note stays
