# server/

Server-only code. Empty until the Hosted Database & API epic (#298):

- `db/` — Neon/Postgres client and Drizzle schema (#304, #307)
- `services/` — service layer with the same function signatures as `lib/db` (#308)

Rules: every module starts with `import "server-only"`, and nothing under `features/`,
`components/` or `hooks/` may import from here (ESLint `no-restricted-imports`). Pure business
rules the server needs come from `lib/domain/`.
