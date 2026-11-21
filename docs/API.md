# HTTP API — `/api/v1`

The JSON API of MorgenMachIch (epic #298). The app itself moves onto it with #314; n8n and
Claude use it with API keys (#315). The machine-readable OpenAPI document follows in #311.

Route Handlers live in `app/api/v1/`, the shared code in `server/api/` (`handle()`, error
contract, body parsing, CSRF checks), the request schemas in `lib/types/api.ts`.

## Endpoints

| Method  | Path               | Access | Body                                                 | Success                     | Issue |
| ------- | ------------------ | ------ | ---------------------------------------------------- | --------------------------- | ----- |
| `GET`   | `/api/v1/settings` | read   | —                                                    | `200 { data: AppSettings }` | #455  |
| `PATCH` | `/api/v1/settings` | write  | `{ statsSince?: string \| null, timeZone?: string }` | `200 { data: AppSettings }` | #455  |

`AppSettings` is `{ id: "app", statsSince: string | null, timeZone?: string }`. Without a saved
row the defaults come back (`statsSince: null`, no `timeZone`); the first `PATCH` must contain
`timeZone`.

## Conventions

### Authentication

Every endpoint needs a signed-in user: the Neon Auth session cookie that the app sets on
sign-in. Without one the answer is `401 unauthorized`; if Neon Auth can't be reached,
`503 auth_unavailable`. API keys for n8n and Claude follow in #315 — each route already
declares the access it needs (`read`, `write`, `delete`); sessions may do everything.

### Success responses

- `200 { "data": … }`, plus `"meta": { … }` where a list needs it (e.g. the changes feed, #456)
- `201 { "data": … }` with a `Location` header on create
- `204` without a body on delete
- Every response is `Cache-Control: no-store`.

### Errors

Every error has the same shape:

```json
{
  "error": {
    "code": "validation",
    "message": "Invalid request body",
    "details": { "issues": [{ "path": "timeZone", "message": "Unknown time zone" }] }
  }
}
```

| Status | `code`                   | When                                                                                     |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------- |
| 400    | `invalid_json`           | The body is empty, not UTF-8 or not valid JSON                                           |
| 401    | `unauthorized`           | No valid session                                                                         |
| 403    | `forbidden`              | The record belongs to someone else, or the credential may not do it                      |
| 403    | `forbidden_origin`       | A write with cookies from another site (see below)                                       |
| 404    | `not_found`              | The record doesn't exist (for this user), or the path is unknown                         |
| 413    | `payload_too_large`      | The body is larger than 1 MB (backup import: 20 MB)                                      |
| 415    | `unsupported_media_type` | `POST` / `PUT` / `PATCH` without `Content-Type: application/json`                        |
| 422    | `validation`             | The body fails the schema or a business rule; `details.issues` lists `{ path, message }` |
| 500    | `internal_error`         | Anything unexpected — no details; the error is in the server log                         |
| 503    | `auth_unavailable`       | Neon Auth is unreachable                                                                 |

`path` is the dotted field path (`subtasks.0.title`); an empty path means the body itself (e.g.
an unknown field). Fields the server owns — `id`, `userId`, `source`, timestamps such as
`completedAt` — are refused with a 422 instead of being ignored.

### Cross-site protection

The session is a cookie, so writes are protected against cross-site requests (CSRF):

- `POST`, `PUT` and `PATCH` need `Content-Type: application/json`.
- A write that carries cookies must come from the app's own origin: browsers send
  `Sec-Fetch-Site: same-origin`; otherwise the `Origin` header must match the host.
- There are no CORS headers: the browser app runs on the same origin, n8n and Claude call
  server-to-server.

## Trying it with curl

Copy the session cookie from the browser (DevTools → Application → Cookies on
morgenmachich.de) into `COOKIE`. Writes also need the `Origin` header, because they carry the
cookie:

```bash
COOKIE='<name>=<value>'

curl -s https://morgenmachich.de/api/v1/settings -H "Cookie: $COOKIE"

curl -s -X PATCH https://morgenmachich.de/api/v1/settings \
  -H "Cookie: $COOKIE" \
  -H "Origin: https://morgenmachich.de" \
  -H "Content-Type: application/json" \
  -d '{"timeZone":"Europe/Berlin"}'
```

Locally, use `http://localhost:3000` for both the URL and the `Origin`.
