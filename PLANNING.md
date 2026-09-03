# MorgenMachIch — Planning

## Decisions so far
- Stack: TypeScript, Next.js (App Router), React, DaisyUI/Tailwind.
- SPA with routed views under a shared layout (persistent nav rail).
- Design direction: dark-first, terminal/dev-tool inspired with Things 3-style tactile warmth. Chosen visual language = "Rounded Tags" palette/shapes (cyan accent, pill tags, circular checkboxes) + nav rail structure from "Two-Tone Split", FAB style from "Rounded Tags", pushed into a layered/3D depth treatment (inset highlights, soft drop shadows, glossy FAB). Locked in the design canvas artifact (Main.dc.html = merged direction).
- UI language: English (job applications outside Germany).
- Persistence: local-only for now (IndexedDB via Dexie.js) behind a repository layer, so it can be swapped for a real backend later in the course without touching UI code.
- Task notes: basic Markdown.
- Today view: computed filter = due today OR overdue; shows all statuses by default, done tasks struck through in place; additional filters (status/label/priority) layer on top.
- Recurring tasks: TaskSeries (template) + generated Task instances per occurrence, independently completable/skippable. No separate completion-log table — stats derive directly from Task rows.
- Task editing: drawer/modal, not a dedicated route.
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

## Feature scope (all confirmed in-scope, no priority tiers)
Task CRUD, card-view list, calendar view, labels + filtering, priority levels, subtasks with progress bar, recurring tasks (independent occurrences), command palette (⌘K), natural-language quick-add, drag & drop, streak/stats, PWA installability, public landing page, settings (data export/import).

## GitHub issue backlog (flat, no milestones)

### Epic: Foundations & Project Setup
- Set up project folder structure and conventions (app router, components, lib, types)
- Configure Tailwind + DaisyUI with the approved dark theme tokens (colors, radii, shadows)
- Define core TypeScript types (Task, TaskSeries, Subtask, Label)
- Set up Dexie.js local database schema
- Build data repository layer (CRUD for tasks, labels, series)
- Build app shell layout (nav rail + routed content area)
- Set up route skeleton: /today, /tasks, /calendar, /labels, /settings
- Initial deploy to Render (get a live URL early)

### Epic: Task CRUD
- Build task drawer/modal component (shared create + edit form)
- Implement create task (validation, save to DB)
- Implement edit task (prefill drawer, save changes)
- Implement delete task (with confirmation)
- Implement complete/incomplete toggle
- Build task card component (title, due date/time, priority indicator, label chips, subtask progress bar)

### Epic: Labels
- Build labels management page (list, create, edit, delete)
- Build label color picker
- Build reusable label chip component
- Implement label-based filtering logic (shared utility)
- Add label filter UI to list & today views

### Epic: List View (/tasks)
- Build full task list page (card view, all tasks)
- Implement sorting (due date / priority / created date)
- Implement status filter (open/done/skipped)
- Build empty state

### Epic: Today View (/today)
- Implement "today or overdue" computed query
- Show all statuses by default; strike through done tasks
- Add layered filter controls (status, label, priority)
- Wire week-strip UI to real dates

### Epic: Subtasks
- Add subtask list editor inside task drawer (add/remove/reorder)
- Implement subtask done/undone toggle
- Build subtask progress bar on task card
- Hide progress bar when a task has no subtasks

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
- Build recurrence rule builder UI (frequency, interval, days of week, end date)
- Implement TaskSeries repository (create/edit/delete/pause)
- Build occurrence-generation engine (lazily materialize upcoming Task rows)
- Implement independent complete/skip per occurrence
- Implement pause/resume series
- Handle editing a series (this occurrence vs. all future ones)

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
