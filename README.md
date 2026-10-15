# MorgenMachIch

[![CI](https://github.com/MonkeyDNaara/MorgenMachIch/actions/workflows/ci.yml/badge.svg)](https://github.com/MonkeyDNaara/MorgenMachIch/actions/workflows/ci.yml)

A local-first to-do app with a card-view task list, a calendar view, custom
labels, and independently-completable recurring tasks. Built as a
portfolio project to demonstrate an AI-assisted ("vibe coded") development
workflow — planned epic-by-epic through GitHub issues, one branch and PR
per issue — while doubling as a to-do app I actually use day to day.

**Live app:** https://morgen-mach-ich.onrender.com
_(free-tier Render service — may take a few seconds to wake up if it's
been idle)_

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
- [chrono-node](https://github.com/wanasit/chrono) for natural-language
  date parsing in quick-add (English + German)
- [dnd-kit](https://dndkit.com) for drag & drop (keyboard and touch
  included)
- A hand-written service worker and web app manifest (installable PWA, no
  library); icons generated from the SVG logo with
  [sharp](https://sharp.pixelplumbing.com) (`npm run icons`)
- [Playwright](https://playwright.dev) for the generated landing-page
  screenshots and link-preview image (`npm run screenshots`)
- Deployed on [Render](https://render.com) via `render.yaml` (Blueprint)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page; once a browser has
opened the app, `/` goes straight to `/today` (`/?landing` shows the landing page anyway).

## Tests

Unit tests use [Vitest](https://vitest.dev) and live next to the code they test
(`*.test.ts`). CI runs them in four time zones on every pull request, because
much of the app is local calendar-day math.

```bash
npm test               # run once
npm run test:watch     # watch mode
npm run test:tz        # Europe/Berlin, America/Los_Angeles, Asia/Kolkata, Pacific/Auckland
npm run test:coverage  # coverage summary
```

## Offline & installing

The app is a PWA: it can be installed (Chrome/Edge install icon, iPhone
"Share → Add to Home Screen") and opens without a connection. A hand-written
service worker (`lib/sw/`, built into `public/sw.js` by `npm run sw`, which runs
before every build) caches the app shell: build files cache-first, pages
network-first with a 3 s timeout, and an offline page for pages not cached yet.
Your tasks themselves live in the browser (IndexedDB) and are always available.

The worker is only registered in production builds. To try it locally:

```bash
npm run build && npm run start
```

Then open DevTools → Application → Service workers (status, "Update on
reload"), Cache storage (the `mm-*` caches) and the Network tab's **Offline**
checkbox. Open a few pages, go offline and reload.

## Landing page screenshots

The screenshots on the landing page (`public/site/screens/`, four views in
light and dark) and the link-preview image (`app/opengraph-image.jpg`, from
`scripts/og-card.html`) are made by a script from the sample data, so they
never drift from the real app. Regenerate them after any visible design change:

```bash
npx playwright install chromium   # once per machine
npm run build && npm run screenshots
```

The script starts the production build on a free port, loads the sample data
into a fresh browser profile per theme, captures `/today`, `/tasks`,
`/calendar` and `/stats` at 1280×800 and writes WebP files (each well under
150 KB). Set `SCREENSHOT_URL=http://localhost:3000` to use a server that is
already running. Commit the new images with the change that caused them.

### Site URL

Link previews, canonical links, `/sitemap.xml` and `/robots.txt` need the
public address. It defaults to `https://morgen-mach-ich.onrender.com`; set
`NEXT_PUBLIC_SITE_URL` (at build time) for another domain. App routes are
`noindex` — only the landing page is meant for search results.

## Project structure & conventions

See [CONVENTIONS.md](./docs/CONVENTIONS.md) for folder layout and naming rules.

## Planning

See [PLANNING.md](./docs/PLANNING.md) for the full data model, route map, and
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
today, tomorrow, later this week or a picked date — and anything typed into
the quick-add bar on /tasks without a date lands there in a keystroke.
A command palette (⌘K / Ctrl+K, built without a library) jumps to any page,
creates tasks, fuzzy-searches existing tasks (open, or tick off with
⌘/Ctrl+Enter) and adds a typed title straight to the backlog. All dates use
one fixed English locale (en-GB).
Natural-language quick-add is done too: typing "Call mom fri 3pm #family
!high" (English or German dates) fills in the due date, label and priority,
with the matched parts colored as you type, a chip for each one (click to
ignore it) and suggestions after "#" and "!". It works in quick-add bars on
/today and /tasks, in the command palette, and as an Apply suggestion in the
new-task drawer.
Stats & Streaks is done as well: a /stats page shows the current and best
streak, a GitHub-style year heatmap, completions per day or week, a
breakdown by label and how many dated tasks were done on time — all
hand-built SVG, no chart library — and a streak badge sits in the /today
header. Stats are calculated from completed tasks, so backups carry them
automatically, and "Reset stats" in Settings gives a fresh start without
changing any task.
A full design pass gave the app its own look ("Dawn Tactile"): amber for
actions and cyan for data, a clear sunken / raised / flat depth rule, a type
scale with an editorial /today header ("Friday." plus a day-progress bar),
a sidebar on desktop and a tab bar on phones, one-row filters, designed empty
states and a "→ Morgen" button that moves a task to tomorrow (with undo).
A light theme ("Dawn Paper": warm cream with burnt-amber actions) followed:
Settings → Appearance offers System / Light / Dark (System follows the
device live), the navigation has a one-click light/dark switch, the command
palette has theme commands, and the page never flashes the wrong theme on
load. Text greys are theme tokens tuned per theme, so secondary text keeps
the same contrast in light and dark.
Quick-add now understands recurrence too: "Gym every mon and thu 6pm until
31 Dec" or "Miete monatlich am 1." (English or German) creates a recurring
series straight from the quick-add bars, the command palette or the task
drawer — with a chip for the rule, the start and the end, a preview of the
first date, and an Undo.
On the weekend the week preview on /today already shows the whole next
week, so Saturday and Sunday are for planning. And a #tag that matches no
label can create it on the spot: the chip shows the new label in the colour
it will get, and ignoring the chip keeps a typo from becoming a label.
On /tasks, done tasks finished more than a week ago step aside: a quiet
"12 done tasks older than 7 days hidden · Show" row under the list brings
them back whenever you want them.
Every option group (status filter, priority, stats period, label colours,
theme) works fully from the keyboard: one Tab stop, arrow keys to choose.
Dates are typed the way you'd say them ("fri", "tomorrow", "12.10.") or
picked from a small calendar with quick picks — always in the app's English
format, never the browser's.
Drag & drop arrived last: the Backlog can be put in your own order (drag a
card by its grip, use the keyboard, or click the grip for "Move to top / up /
down / bottom"), tasks can be dragged to another day on the calendar or onto
a "Coming up" day on /today (the time stays, Undo is one click away), and a
Backlog tray next to the calendar lets you plan the week by dropping tasks
onto days.
The app can now be installed (PWA): it has its own logo, opens on /today as
"Morgen" in its own window or from the home screen, offers New task / Today /
Calendar shortcuts and shows the number of open tasks in the tab title and on
the app icon. A service worker keeps the app shell, so every page you've opened
once loads offline and the app opens within seconds even while the server wakes
up. Settings → App explains how to install it in your browser, and after a
deploy a "New version · Reload" toast lets you choose when to update.
The app now has a public landing page at `/`: a hero with the real Today
screen, a live quick-add demo running the real parser, the features, real
screenshots in both themes (made by a script from sample data), how the app
is built and who built it. "Try it with sample data" fills an empty app with
demo tasks dated around today; browsers that have used the app before go
straight to /today. Links shared on LinkedIn show a preview card, and an
Impressum and a short privacy notice are in the footer.
Every helper behind those features is covered by tests: 670+ Vitest tests run on
every pull request in four time zones, because so much of the app is local
calendar-day math.
Planned next: a hosted database (Neon + Drizzle) with an API and login, so
n8n and Claude/Obsidian can work with the tasks.
