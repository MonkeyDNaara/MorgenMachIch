# MorgenMachIch

[![CI](https://github.com/MonkeyDNaara/MorgenMachIch/actions/workflows/ci.yml/badge.svg)](https://github.com/MonkeyDNaara/MorgenMachIch/actions/workflows/ci.yml)

A local-first to-do app with a card-view task list, a calendar view, custom
labels, and independently-completable recurring tasks. Built as a
portfolio project to demonstrate an AI-assisted ("vibe coded") development
workflow — planned epic-by-epic through GitHub issues, one branch and PR
per issue — while doubling as a to-do app I actually use day to day.

**Live app:** https://morgenmachich.de
_(free-tier Render service in Frankfurt — may take a few seconds to wake up
if it's been idle)_

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com) + [DaisyUI](https://daisyui.com)
- [Dexie.js](https://dexie.org) (IndexedDB) for the app's data today —
  the repository layer in `lib/db` is the only place that talks to storage,
  so the move to the hosted database stays contained there
- [Neon](https://neon.tech) (Postgres, Frankfurt) +
  [Drizzle ORM](https://orm.drizzle.team) over postgres.js for the
  server-side service layer in `server/` (tested with
  [PGlite](https://pglite.dev)); Neon Auth for the upcoming login
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
- Deployed on [Render](https://render.com) (Frankfurt) via `render.yaml`
  (Blueprint), on the custom domain `morgenmachich.de`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page; once a browser has
opened the app, `/` goes straight to `/today` (`/?landing` shows the landing page anyway).

### Database (in progress)

The hosted database (Neon Postgres in Frankfurt + Drizzle ORM, epic #298) is being built; the app
itself still keeps tasks in the browser. To work on the server side, copy `.env.example` to
`.env.local`, fill in the connection strings of the Neon `dev` branch, then:

```bash
npm run db:check     # one query against the database, prints the timing
npm run db:generate  # create a migration from server/db/schema.ts
npm run db:migrate   # apply migrations (direct connection)
```

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
service worker (`features/pwa/sw/`, built into `public/sw.js` by `npm run sw`, which runs
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
public address. It defaults to `https://morgenmachich.de`; set
`NEXT_PUBLIC_SITE_URL` (at build time) for another domain. On Render,
`CANONICAL_HOST` (e.g. `morgenmachich.de`) makes `proxy.ts` send every
request that arrives on another host — the service's own `onrender.com`
address, the old Oregon service — a 308 redirect to the same path on that
host; locally it is unset and nothing redirects. App routes are
`noindex` — only the landing page is meant for search results.

## Health check

```bash
# Liveness — Render's healthCheckPath, never touches the database
curl https://morgenmachich.de/api/health
# → {"status":"ok","version":"0.1.0","commit":"884b8a7"}

# Deep check — `select 1` against Neon (5 s timeout): 200, or 503 when unreachable
curl https://morgenmachich.de/api/health?db=1
# → {"status":"ok","version":"0.1.0","commit":"884b8a7","db":{"status":"ok","latencyMs":24}}
```

Render only checks liveness, so a database problem never restarts the app; the deep check is
for curl, n8n and monitoring. Neither response contains error details (those go to the server
log), and `/api/health` is exempt from the canonical-host redirect.

## Auth

Login runs on [Neon Auth](https://neon.com/docs/neon-auth/overview) (Better Auth), set up in
`server/auth/` (#309). The browser's auth client talks to `/api/auth/*`, which forwards to Neon
Auth after a rate limit: 10 sign-in or code attempts per IP and per email in 15 minutes, 5
email-sending requests (sign-up, codes, password reset) per hour, 429 with `Retry-After` beyond
that. The client IP is the rightmost `X-Forwarded-For` entry outside private and Cloudflare
networks. Route Handlers of the coming `/api/v1` start with `requireUser()` (401 without a
session). Locally, `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` in `.env.local` point to
the Neon `dev` branch (see `.env.example`).

`package.json` has npm `overrides` for `better-auth` (1.7.14) and `zod` (4.6.7): Neon Auth 0.6.0-beta
pins better-auth 1.7.6 and zod 4.5.4, which have security advisories (#447). Remove the overrides
once `@neondatabase/auth` ships better-auth ≥ 1.7.7 and zod ≥ 4.6.6.

## Project structure & conventions

See [CONVENTIONS.md](./docs/CONVENTIONS.md) for folder layout and naming rules.

The one-time Prettier reformat is listed in `.git-blame-ignore-revs`, so `git blame`
skips it after `git config blame.ignoreRevsFile .git-blame-ignore-revs` (GitHub does this
automatically).

## Planning

See [PLANNING.md](./docs/PLANNING.md) for the full data model, route map, and
GitHub issue backlog. Decisions and scope get updated there as the
project evolves.

## Status

Built epic by epic — every decision is recorded in [PLANNING.md](./docs/PLANNING.md).

**Done**

- **Tasks & labels:** create/edit/delete in a drawer, subtasks with progress, priorities, colour labels, filters and sorting; a Backlog for tasks without a date, with "Plan for…"
- **Views:** /today with an editorial header, day progress and a week preview; /tasks with Tasks, Recurring and Backlog columns; a /calendar month view with projected future occurrences
- **Today briefing:** Important (urgent high-priority tasks), Yesterday (done vs. due, what was left open) and This week (completions per day, on-time rate, comparison with last week) above the task list — collapsible on desktop, stacked around the tasks on mobile
- **Recurring tasks:** daily/weekly/monthly rules (incl. "first Monday"), independent occurrences, pause, edit, three ways to delete a series
- **Natural-language quick-add** (English + German): `Call mom fri 3pm #family !high` or `Gym every mon and thu 6pm until 31 Dec` — live-coloured tokens, ignorable chips, new labels from unknown `#tags`
- **Command palette** (⌘K / Ctrl+K, no library): fuzzy search, page jumps, actions
- **Stats & streaks:** current/best streak, year heatmap, completion charts, label breakdown, on-time rate — hand-built SVG
- **Drag & drop:** manual Backlog order, rescheduling on the calendar and "Coming up", keyboard and move-menu alternatives
- **Design:** own look ("Dawn Tactile" dark / "Dawn Paper" light, System / Light / Dark), keyboard-correct controls, custom date field
- **PWA:** installable, own logo, offline app shell, update toast
- **Landing page** with a live quick-add demo, generated screenshots, Open Graph image, Impressum and privacy notice
- **Quality:** 850+ Vitest tests in four time zones, Prettier, ESLint layer rules, CI on every pull request
- **Server layer** (not wired to the UI yet): Neon Postgres in Frankfurt, Drizzle schema and migrations, a user-scoped service layer with server-side recurrence, tested against PGlite
- **Hosting:** Render in Frankfurt on [morgenmachich.de](https://morgenmachich.de)

**In progress:** Hosted Database & API (#298) — login with Neon Auth (#299), `/api/v1` routes, then the app moves from browser storage (IndexedDB) to the database. Today Dashboard phase 2 (#419): entries written by agents, Apple Health and training data.

**Planned:** automation and a "second brain" with n8n and Claude/Obsidian (#300), feedback & admin (#323), projects with their own backlog (#435).
