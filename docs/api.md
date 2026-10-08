# API reference

Base URL `/api/v1`; health is `GET /api/health`. The machine-readable contract is
[`openapi.json`](openapi.json) (regenerate with `make types`; a test fails when it drifts).
Interactive docs: `/docs` on a running server.

## Conventions

- **Thin routers.** A route parses the request, calls one service method and returns its schema.
  `scripts/check_layering.py` fails the build if `app/api` imports models, db, repositories or
  SQLAlchemy, or if `app/services` imports FastAPI/Starlette. `app/core/deps.py` is the
  composition root: the one module that builds services (and picks the AI provider) for a
  request, so it may import services and `app.ai`.
- **Error envelope on every error:** `{"error": {"code", "message", "details"}}`. `code` is a
  stable machine string (`NOT_FOUND`, `MEETING_DELETED`, `CHANNEL_EXISTS`, `RATE_LIMITED`, ...).
  Every route declares the errors it can return with the `ErrorResponse` schema.
- **Validation (422):** `details.errors` is a list of `{loc, msg, type}`; `loc` is the field path,
  e.g. `["body", "segments", "0", "start_ms"]` or `["query", "scope"]`.
- **Status codes:** 200 read/update, 201 create, 204 every DELETE (empty body), 404 unknown id,
  409 conflict, 410 soft-deleted meeting (restorable), 422 validation, 429 AI rate limit,
  503 dependency unavailable (e.g. `NOT_SEEDED`), 500 unexpected (`details.request_id`).
- **Pagination:** every list returns `{items, page, page_size, total, total_pages, has_next}`.
  Query `page` (from 1) and `page_size` (default 20, clamped to 100).
- **Filtering and sorting (`GET /meetings`):** `q`, `participant`, `date_from`, `date_to`
  (inclusive UTC days), `tag` (tag id, repeat for any-of), `channel` (id),
  `scope` (`all|hosted|shared|uploads`), `status` (`completed|upcoming`), `sort`
  (`-started_at` default, `started_at`, `title`, `-duration_ms`).
  - `q` matches a case-insensitive substring of the title, a participant name or the summary
    overview, **or** every word of it in the transcript (FTS5, last word as a prefix; the same
    safe query builder as `/search`).
  - `status=completed` (default, the library) is `status = completed` only; `status=upcoming`
    is `scheduled` with `started_at` in the future. A scheduled meeting whose time passed, and
    live/processing meetings, appear in neither.
- **Meeting rows** (list and detail) carry `status`, `channel_id`, `channel` (`{id, name, slug}`
  or null), `meeting_url`, `platform` and `language`, so the Upcoming tab and channel chips need
  no extra calls.
- **`POST /meetings` `source`** may be `upload`, `paste` or `manual` (default); `seed`,
  `capture` and `calendar` are set only by the server (422 otherwise).
- **Shallow nesting:** collections live under the parent (`/meetings/{id}/action-items`);
  items are top-level (`/action-items/{id}`).
- **Times:** UTC ISO-8601. Recording positions are integer milliseconds (`start_ms`, `end_ms`,
  `duration_ms`).
- **Transcript previews are a noun resource, nothing is stored:** `POST /transcript-previews`
  (JSON `{text, filename?}`) and `POST /transcript-previews/files` (multipart `file`), each with a
  precise OpenAPI schema. For uploads, a declared `Content-Length` above `MAX_UPLOAD_MB` (plus a
  small multipart allowance) is rejected up front with `422 UPLOAD_TOO_LARGE`; otherwise the file
  is read at most `MAX_UPLOAD_MB + 1` bytes and rejected if it exceeds the limit. Pasted text is
  measured by the service with the same limit and code. A line over 5000 characters is split
  into consecutive segments (at word boundaries, sharing its time span by text length) with a
  warning, never truncated.
- **Rate limiting:** only requests that run the AI are limited: `POST
  /meetings/{id}/summary/regenerate`, and `POST /meetings` **when it carries `segments`**. They
  share one per-client budget, `AI_RATE_LIMIT` (default `10/minute`, read from the app's
  settings). The check runs after the service's guards, so 404/409/410/422 responses never use
  up the budget. The 429 carries `Retry-After`. The client address is the first `X-Forwarded-For` hop when present,
  else the socket peer; that header is only trustworthy behind a proxy that sets it (Vercel does),
  and counters are in memory, per process.
- **AI failures:** a provider error that escapes the fallback wrapper is `503 AI_UNAVAILABLE`
  (`ProviderError` is a `ServiceUnavailableError`); the message is generic, the cause is logged.
- **Unseeded database:** every route that needs the default user answers `503 NOT_SEEDED`,
  including `POST /meetings`.
- **Operation ids** are the handler names (`list_meetings`, `create_action_item`, ...), and tags
  are plural kebab-case (`action-items`, `summaries`).
- **Media:** `GET /meetings/{id}/media` streams the file and honours `Range` (206).

## Endpoints

| Method | Path | Success | Declared errors |
|---|---|---|---|
| GET | `/meetings` | 200 Page of meetings | 422, 503 |
| POST | `/meetings` | 201 meeting | 422, 429, 503 |
| GET | `/meetings/{id}` | 200 meeting | 404, 410, 422 |
| PATCH | `/meetings/{id}` | 200 meeting | 404, 409, 410, 422 |
| DELETE | `/meetings/{id}` | 204 | 404, 410, 422 |
| POST | `/meetings/{id}/restore` | 200 meeting | 404, 422 |
| POST | `/transcript-previews` | 200 preview (JSON) | 422 |
| POST | `/transcript-previews/files` | 200 preview (multipart) | 422 |
| GET | `/meetings/{id}/transcript` | 200 speakers + segments | 404, 410, 422 |
| PATCH | `/segments/{id}` | 200 segment | 404, 410, 422 |
| PATCH | `/speakers/{id}` | 200 speaker | 404, 410, 422 |
| GET | `/meetings/{id}/media` | 200 / 206 audio bytes | 404, 410, 422 |
| GET | `/meetings/{id}/summary` | 200 summary | 404, 410, 422 |
| POST | `/meetings/{id}/summary/regenerate` | 200 summary | 404, 409, 410, 422, 429, 503 |
| GET | `/meetings/{id}/action-items` | 200 Page of items | 404, 410, 422 |
| POST | `/meetings/{id}/action-items` | 201 item | 404, 410, 422 |
| PATCH | `/action-items/{id}` | 200 item | 404, 410, 422 |
| DELETE | `/action-items/{id}` | 204 | 404, 410, 422 |
| GET | `/search?q=` | 200 Page of hits | 422 |
| GET | `/channels` | 200 Page of channels | 422 |
| POST | `/channels` | 201 channel | 409, 422 |
| PATCH | `/channels/{id}` | 200 channel | 404, 409, 422 |
| DELETE | `/channels/{id}` | 204 | 404, 422 |
| GET | `/me` | 200 user | 503 |
| GET | `/users` | 200 Page of users | 422 |

`GET /me` declares no 4xx: there is no authentication yet, the current user is the seeded default.

## Worked examples

**1. Preview, then create from pasted text**

```
POST /api/v1/transcript-previews
{"text": "WEBVTT\n\n00:00.000 --> 00:03.000\n<v Alice>Plan the launch\n", "filename": "a.vtt"}

200 {"format": "vtt", "timings_estimated": false, "speakers": ["Alice"], "segment_count": 1,
     "duration_ms": 3000, "warnings": [],
     "segments": [{"speaker": "Alice", "start_ms": 0, "end_ms": 3000, "text": "Plan the launch"}]}

POST /api/v1/meetings      (send the preview's segments back)
{"title": "Launch", "participants": ["Bob"], "segments": [ ... ]}

201 {"id": 1, "title": "Launch", "duration_ms": 3000, ...}
```

**2. Filtered, paged list**

```
GET /api/v1/meetings?q=launch&scope=hosted&sort=-started_at&page_size=1

200 {"items": [{"id": 1, "title": "Launch", ...}], "page": 1, "page_size": 1,
     "total": 1, "total_pages": 1, "has_next": false}
```

**3. Errors: validation, then delete and 410**

```
POST /api/v1/channels   {"name": ""}

422 {"error": {"code": "VALIDATION_ERROR", "message": "Request validation failed",
     "details": {"errors": [{"loc": ["body", "name"],
     "msg": "String should have at least 1 character", "type": "string_too_short"}]}}}

DELETE /api/v1/meetings/1          -> 204 (empty body)
GET    /api/v1/meetings/1          -> 410 {"error": {"code": "MEETING_DELETED", ...}}
POST   /api/v1/meetings/1/restore  -> 200 meeting
```
