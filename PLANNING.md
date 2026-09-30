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
- Backlog tasks (decided after #168, epic not built yet): a task with no `dueDate` **is** a backlog task — no new status or flag. `Task.dueDate` is already nullable, so there is no schema change and old backups stay valid. Backlog tasks are listed in their own hideable/showable column/section; a "Plan for…" action promotes one to a due task by setting a due date (today, tomorrow, this week, or a picked date), which moves it out of the backlog. Placement is undecided: `/tasks` is already two columns (Tasks, Recurring), so a third column may be crowded — decide when the epic is planned. Open point for planning: what "no due date" means for tasks that currently show in the main Tasks column.
- Future direction — Neon (added after #168): the local-only IndexedDB persistence is planned to move to Neon (hosted Postgres) so tasks can also be added from a phone. The `lib/db` repository layer is the swap point; it will need an API layer and authentication, and the versioned backup format (`lib/utils/backup.ts`) is the natural migration path. Not scheduled; decide scope when picked up.
- Future direction — second brain (added after #168): the app is meant to become part of a "second brain" built with Claude and Obsidian, where Claude helps manage and work on tasks, so the app will eventually need an interface/API for that. Design unknown for now; until then keep domain logic in pure functions (`lib/utils`) and keep data formats versioned so an API/agent interface can reuse them.
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
Task CRUD, card-view list, calendar view, labels + filtering, priority levels, subtasks with progress bar, recurring tasks (independent occurrences), command palette (⌘K), natural-language quick-add, drag & drop, streak/stats, PWA installability, public landing page, settings (data export/import). Planned later: backlog (dateless tasks), light theme, Neon-hosted database (phone access), second-brain (Claude + Obsidian) integration.

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

### Epic: Calendar View (/calendar) — core done (#145), recurring done (#168)
- Month grid (Mon-Sun weeks, dynamic 4-6 rows) with prev/next navigation and a "Today" reset — done (#145)
- Tasks plotted per day as a compact mini-list (PriorityDot + truncated title, capped at 3 + "+N" overflow), same idiom as the week-ahead strip's day columns — done (#145)
- Day click drills into the shared TaskList scoped to that date (any status), reusing TodayView's selectedDay/baseFilter pattern, with a "Back to month" control — done (#145)
- Render recurring occurrences correctly — done (#168): real rows already rendered; read-only projected "ghost" occurrences added beyond the 60-day horizon, repeat icon on recurring entries, "Projected" list in the day drill-down
- Add label + priority filters to the calendar month grid (the grid has no filter bar; only the day drill-down inherits TaskList's) — planned follow-up; must apply to projected occurrences too
- (Stretch, not yet scoped) week view toggle — separate issue once we've used the month view for a while

### Epic: Recurring Tasks — done
- Build recurrence rule builder UI (frequency + interval; weekly: day-of-week multi-select; monthly: choice of a fixed day-of-month **or** an "Nth weekday of month" pattern like "first Monday"; end date) — done (#58)
- Build occurrence-generation engine (lazily materialize upcoming Task rows, 60-day rolling horizon on app load), including monthly day-of-month/Nth-weekday math (e.g. months without a 31st) — done (#60)
- Implement TaskSeries repository (create/edit/delete/pause) — base CRUD done in #21 (`lib/db/taskSeries.ts`); pause/resume done (#62); edit-with-regeneration done (#63); delete done (#148)
- Implement independent complete/skip per occurrence — done (#61): skip icon-button on occurrence cards (recurring + still open only); skipped tasks hidden by default from Today/Calendar/tasks, excluded from the Overdue filter, auditable via a new "Skipped" status filter on /tasks
- Implement pause/resume series and split /tasks into a Tasks/Recurring two-column layout (one row per series) — done (#62)
- Handle editing a series — done (#63): template-only edit semantics (no split-off); edit drawer opened from the series row, saving regenerates open today-or-later occurrences
- Handle deleting a series — done (#148): delete button in the series drawer with a three-way choice (series + upcoming open tasks / series only, keep tasks / series + everything); kept tasks are detached; recurring occurrences can't be deleted individually from the task drawer (Skip instead)

### Epic: Command Palette
- Build ⌘K palette UI (search + action list)
- Implement quick navigation between routes
- Implement quick-add task from palette
- Implement quick actions (complete, jump to today, open calendar)

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

### Epic: Backlog (tasks without a due date)
- Make "no due date" a first-class, visible concept: backlog tasks (`dueDate === null`) listed in their own hideable/showable column or section
- "Plan for…" action to promote a backlog task to a due task (today / tomorrow / this week / pick a date)
- Decide placement relative to the existing /tasks Tasks/Recurring columns
- Check that Today/Calendar/filters treat dateless tasks consistently

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
- Set up Vitest (+ fake-indexeddb for Dexie) in the project
- Unit tests for pure utilities: recurrence date-math (`lib/utils/recurrence.ts`), filter/sort functions, date helpers (`isDueToday`, `formatDueDate`), and the backup validator (`parseBackup()` in `lib/utils/backup.ts`, `getBackupNudge()` — already exercised with ~20 ad-hoc cases during #162, a good seed) plus `projectSeriesOccurrences()` (9 scratch cases during #168)
- Tests for the `lib/db` repository layer (CRUD + validation behavior)
- (Maybe) component tests for the trickiest UI logic (e.g. TaskDrawerPanel's conditional validation)

### Epic: Deployment & Ops
- Set up Render Web Service for the Next.js app
- Configure build/start commands and environment variables
- Set up auto-deploy from main branch
- Add error boundary / 404 page
- Note migration path from Dexie to a real API layer for when the backend arrives
