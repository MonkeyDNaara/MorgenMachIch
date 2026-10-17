# server/

Server-only code for the Hosted Database & API epic (#298):

- `env/` — validated server environment variables (`getServerEnv()`, #304)
- `db/` — Drizzle client `getDb()` (#304), schema and migrations (#307)
- `services/` — service layer with the same function signatures as `lib/db` (#308)
- `health.ts` — database check and response body for `/api/health` (#305)

Rules: every module starts with `import "server-only"`, and nothing under `features/`,
`components/` or `hooks/` may import from here (ESLint `no-restricted-imports`). Pure business
rules the server needs come from `lib/domain/`.
