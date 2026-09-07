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
- Recurring tasks: TaskSeries (template) + generated Task instances per occurrence, independently completable/skippable. No separate completion-log table — stats derive directly from Task rows. Deleting a series: `deleteTaskSeries()` removes just the template (occurrences stay), `deleteTaskSeriesAndOccurrences()` removes the template and every generated Task — which one to call is a UI decision ("delete just this task or the whole series?") made when the delete-series UI is built (Recurring Tasks epic), not decided in the repository layer.
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
- Deployment target: Render (Node Web Service, not Vercel).
- Milestones: no v1/v1.1 split — single flat backlog.

## Route map
- `/today` — today + overdue tasks (default landing view)
- `/tasks` — full card-view list, all tasks
- `/calendar` — month view with due dates
- `/labels` — manage labels
- `/settings` — preferences, data export/import
- Task detail/edit — drawer/modal, not a route

## Data model (TypeScript)

```ts
type Priority = 'none' | 'low' | 'medium' | 'high';
type TaskStatus = 'open' | 'done' | 'skipped';

type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[]; // 0=Sun..6=Sat, for weekly
  endDate?: string | null;
  // TODO (added after #21): monthly needs two modes — a fixed
  // day-of-month (e.g. "the 15th") or an "Nth weekday of month" pattern
  // (e.g. "first Monday"). Exact shape (monthlyMode + dayOfMonth +
  // nthWeekday fields) TBD when the Recurring Tasks epic's rule-builder
  // issue is designed; will extend this type + the Zod schema then.
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
Task CRUD, card-view list, calendar view, labels + filtering, priority levels, subtasks with progress bar, recurring tasks (independent occurrences), command palette (⌘K), natural-language quick-add, drag & drop, streak/stats, PWA installability, public landing page, settings (data export/import).

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

### Epic: Priority
- Add priority selector to task drawer
- Add visual priority indicator to task card
- Add priority filter option

### Epic: Calendar View (/calendar)
- Build month-view calendar grid
- Plot tasks on their due dates
- Implement day click → view/edit that day's tasks
- Render recurring occurrences correctly
- (Stretch) week view toggle

### Epic: Recurring Tasks
- Build recurrence rule builder UI (frequency + interval; weekly: day-of-week multi-select; monthly: choice of a fixed day-of-month **or** an "Nth weekday of month" pattern like "first Monday"; end date)
- Implement TaskSeries repository (create/edit/delete/pause) — base CRUD done in #21 (`lib/db/taskSeries.ts`); pause/resume and series-vs-occurrence edit semantics still open
- Build occurrence-generation engine (lazily materialize upcoming Task rows), including monthly day-of-month/Nth-weekday math (e.g. months without a 31st)
- Implement independent complete/skip per occurrence
- Implement pause/resume series
- Handle editing a series (this occurrence vs. all future ones)
- Handle deleting a series (this occurrence only vs. whole series — UI decision, calls `deleteTask()` or `deleteTaskSeriesAndOccurrences()` from #21 accordingly)

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

### Epic: Settings
- Build settings page skeleton
- Implement data export (JSON download)
- Implement data import (JSON upload + validation)
- (Deferred) light theme toggle placeholder

### Epic: Deployment & Ops
- Set up Render Web Service for the Next.js app
- Configure build/start commands and environment variables
- Set up auto-deploy from main branch
- Add error boundary / 404 page
- Note migration path from Dexie to a real API layer for when the backend arrives
