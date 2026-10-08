# MorgenMachIch

[![CI](https://github.com/MonkeyDNaara/MorgenMachIch/actions/workflows/ci.yml/badge.svg)](https://github.com/MonkeyDNaara/MorgenMachIch/actions/workflows/ci.yml)

A local-first to-do app with a card-view task list, a calendar view, custom
labels, and independently-completable recurring tasks. Built as a
portfolio project to demonstrate an AI-assisted ("vibe coded") development
workflow — planned epic-by-epic through GitHub issues, one branch and PR
per issue — while doubling as a to-do app I actually use day to day.

**Live app:** https://morgen-mach-ich.onrender.com
*(free-tier Render service — may take a few seconds to wake up if it's
been idle)*

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com) + [DaisyUI](https://daisyui.com)
- [Dexie.js](https://dexie.org) (IndexedDB) for local-only persistence —
  no backend yet; the repository layer in `lib/db` is the only place that
  talks to storage, so swapping in a real API later stays contained there
- [Zod](https://zod.dev) — schemas in `lib/types` are the source of truth
  for both compile-time types and runtime validation at the storage
  boundary
- [lucide-react](https://lucide.dev) for icons
- Deployed on [Render](https://render.com) via `render.yaml` (Blueprint)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/today`.

## Project structure & conventions

See [CONVENTIONS.md](./CONVENTIONS.md) for folder layout and naming rules.

## Planning

See [PLANNING.md](./PLANNING.md) for the full data model, route map, and
GitHub issue backlog. Decisions and scope get updated there as the
project evolves.

## Status

Actively being built epic-by-epic (see the issue backlog in
`PLANNING.md`). Foundations, Task CRUD, Labels, List View, Today View,
Subtasks, Priority, and the Calendar View core are done — project
structure, theme, types, local DB, repository layer, app shell,
routes, the initial Render deploy, full create/edit/delete/toggle task
cards, labels (create/edit/delete, assignment, display, filtering),
sorting/status filtering on /tasks, the /today view (today/overdue
scope plus a clickable week-ahead strip), subtasks (drawer editor,
progress bar on the card), priority levels (drawer selector, card
indicator dot, filter dropdown), and a /calendar month view (task
plotting per day, day drill-down). The Recurring Tasks epic is
done: the recurrence rule builder and occurrence-generation
engine are done (daily/weekly/monthly, independent occurrences on a
rolling 60-day horizon), occurrences can be independently skipped
(hidden by default, auditable via a status filter), and series can be
paused/resumed and edited (a drawer opened from the series row; saving
regenerates upcoming open occurrences); /tasks splits into a Tasks column
and a Recurring column (one row per series) so a single series doesn't
flood the list. A series can also be deleted, choosing whether to keep,
remove, or wipe its existing tasks.
The Settings epic is done too: /settings offers a JSON backup export (with
a last-backup reminder), an import that validates the whole file first and
then replaces all data after a preview and confirmation (auto-downloading a
safety backup beforehand), a delete-all-data danger zone, and an About
card. The calendar also shows read-only projected occurrences of
recurring series beyond the ~60 days of generated tasks, so a series never
looks like it ended, and it can be filtered by label and priority.
Deployment & Ops is done as well: the app auto-deploys to Render from `main`
(checked: every merge goes live in about a minute), unknown URLs and runtime
crashes show styled 404 and error pages (with a hint when browser storage is
blocked), and a GitHub Actions workflow type-checks, lints and builds every
pull request.
The Backlog epic is done too: tasks without a due date live in their own
hideable column on /tasks (sorted by priority, then oldest first, with an
"added 3d ago" marker). A "Plan for…" menu turns one into a due task —
today, tomorrow, later this week or a picked date — and an inline input at
the top of the column adds new ones in a keystroke.
A command palette (⌘K / Ctrl+K, built without a library) jumps to any page,
creates tasks, fuzzy-searches existing tasks (open, or tick off with
⌘/Ctrl+Enter) and adds a typed title straight to the backlog. All dates use
one fixed English locale (en-GB). Planned next: natural-language quick-add,
stats, a light theme, and later a hosted database (Neon).
