# Finbar API conventions (MVP)

Base URL in development: `http://127.0.0.1:3001`. Feature routes live under **`/api/**`**. There is no separate `/api/v1` prefix in the MVP; versioning can be added later if breaking changes appear.

## Success responses

JSON responses for `/api/**` use a single envelope:

```json
{ "data": { /* payload */ } }
```

Lists use pagination metadata inside `data` (see below).

## Error responses

Errors use a consistent shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": {}
  }
}
```

- **`code`**: stable machine-readable identifier (e.g. `VALIDATION_ERROR`, `UNAUTHORIZED`, `CONFLICT`).
- **`message`**: safe to show in UI copy.
- **`details`**: optional; often Zod `flatten()` output for validation errors.

HTTP status codes follow usual semantics (400 validation, 401 auth, 404 not found, 409 conflict, 500 server).

Non-API routes (`/`, `/health`) may use smaller ad-hoc JSON shapes for ops/debugging.

## Validation

Request bodies and query strings are validated with **Zod**. Invalid input returns **400** with `code: "VALIDATION_ERROR"` and `details` from Zod.

## Authentication

Session auth uses an **httpOnly** cookie (`finbar_token`) set by `POST /api/auth/login` and `POST /api/auth/register`. Protected handlers use a shared `preHandler` that verifies the JWT.

## Pagination (lists)

Offset-based query parameters (future list endpoints):

| Parameter | Default | Max |
|-----------|---------|-----|
| `limit`   | 20      | 100 |
| `offset`  | 0       | —   |

List responses:

```json
{
  "data": {
    "items": [],
    "pagination": { "limit": 20, "offset": 0, "total": 0 }
  }
}
```

## Discovery

`GET /api` returns basic service metadata and where auth lives.

## Jobs (authenticated)

Base path: **`/api/jobs`** (session cookie required).

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/jobs` | List jobs for the current user (`limit`, `offset`, optional `status`) |
| `POST` | `/api/jobs` | Create job |
| `GET` | `/api/jobs/:id` | Job detail |
| `PATCH` | `/api/jobs/:id` | Update job (name, address, notes, status) |

Statuses: `PLANNING`, `ACTIVE`, `COMPLETED`, `ARCHIVED`.

## Workers (authenticated)

Base path: **`/api/workers`** (session cookie required).

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/workers` | List workers (`limit`, `offset`) |
| `POST` | `/api/workers` | Create worker |
| `GET` | `/api/workers/:id` | Worker detail |
| `PATCH` | `/api/workers/:id` | Update worker (name, `trades[]`, notes) |

## Tasks (authenticated)

Base path: **`/api/tasks`** (session cookie required).

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/tasks` | List tasks (`limit`, `offset`, optional `jobId`, `status`, `scheduledDate` as `YYYY-MM-DD`) |
| `POST` | `/api/tasks` | Create task (requires `jobId` owned by user; optional worker must be yours) |
| `GET` | `/api/tasks/:id` | Task detail (includes job name when available) |
| `PATCH` | `/api/tasks/:id` | Update task; setting `status` to `DONE` sets `completedAt` |

Statuses: `OPEN`, `IN_PROGRESS`, `DONE`, `CANCELLED`.

## Worker availability (authenticated)

Base path: **`/api/worker-availability`** (session cookie required).

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/worker-availability` | List rows in a date range (`from`, `to` as `YYYY-MM-DD`; optional `workerId`; `limit` default 500, max 500) |
| `PUT` | `/api/worker-availability` | Upsert one day for a worker (`workerId`, `date`, `status`, optional `notes`) |
| `DELETE` | `/api/worker-availability/:id` | Remove that availability row |

Statuses: `AVAILABLE`, `UNAVAILABLE`.

## Schedule assignments (authenticated)

Base path: **`/api/schedule-assignments`** (session cookie required).

Who is planned on which job on which calendar day (separate from tasks).

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/schedule-assignments` | List assignments (`from`, `to` as `YYYY-MM-DD`; optional `workerId`, `jobId`; `limit` default 500) |
| `POST` | `/api/schedule-assignments` | Create (`workerId`, `jobId`, `date`, optional `notes`) — duplicate worker+job+day returns **409** |
| `PATCH` | `/api/schedule-assignments/:id` | Update `notes` |
| `DELETE` | `/api/schedule-assignments/:id` | Remove assignment |

## Today (authenticated)

Base path: **`/api/today`** — aggregated snapshot for one calendar day.

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/today` | Dashboard payload for `date` (`YYYY-MM-DD`, optional; default UTC “today” — clients should pass the viewer’s local date). Optional **`jobId`** scopes the snapshot to that job (must belong to the user): crew, active jobs, tasks, availability, and schedule warnings are filtered accordingly. |

Response includes: crew (schedule rows), availability rows, **ACTIVE** jobs touching that day, tasks due that day, overdue open tasks, unassigned open tasks, and **scheduleWarnings** when someone is scheduled but marked unavailable.

## Preferences (authenticated)

Base path: **`/api/preferences`** — user-level UI preferences (`UserPreference` in Prisma).

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/preferences` | Current preference row (created with defaults if missing) |
| `PATCH` | `/api/preferences` | Update `largeTextMode` and/or `preferredView` |

`GET /api/auth/me` includes the same **`preference`** object (`largeTextMode`, `preferredView`) for a single load after login.

## OpenAPI

Full OpenAPI/Swagger is not wired in the MVP; this document plus route modules are the source of truth until the API grows.

## Implementation note (Fastify)

Register **`setErrorHandler` on the root app before `register()`-ing route plugins**. Encapsulated plugins inherit the active error handler at registration time; registering the handler only after routes would leave plugin routes on Fastify’s default error serializer.
