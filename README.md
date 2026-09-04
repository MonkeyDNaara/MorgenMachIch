# MorgenMachIch

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
`PLANNING.md`). Foundations and the Task CRUD epic are done — project
structure, theme, types, local DB, repository layer, app shell, routes,
the initial Render deploy, and full create/edit/delete/toggle task cards.
Up next: the Labels epic.
