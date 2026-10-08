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
  (inclusive whole days in `tz`), `tz` (IANA zone name such as `Asia/Kolkata`, default `UTC`;
  an unknown name is `422 INVALID_TIMEZONE`), `tag` (tag id, repeat for any-of), `channel` (id),
  `scope` (`all|hosted|shared|uploads`), `status` (`completed|upcoming`), `sort`
  (`-started_at` default, `started_at`, `title`, `-duration_ms`).
  - Dates are calendar days where the viewer is: `date_from=date_to=2026-10-09&tz=Asia/Kolkata`
    covers `2026-10-08T18:30Z` up to (not including) `2026-10-09T18:30Z`, so a meeting at
    `2026-10-08T20:00Z` is included; with the default `tz=UTC` it is not.
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
  /meetings/{id}/summary/regenerate`, `POST /meetings/{id}/ask`, `POST /search/ask`, and
  `POST /meetings` **when it carries `segments`**, `POST /chats` and `POST /chats/{id}/messages`
  (only when the chosen skill will call the AI). They share one per-client budget,
  `AI_RATE_LIMIT` (default `10/minute`, read from the app's settings). The check runs after the
  service's guards, so 404/409/410/422 responses never use up the budget, and neither does an
  ask with nothing to answer from. The 429 carries `Retry-After`. The client address is the first `X-Forwarded-For` hop when present,
  else the socket peer; that header is only trustworthy behind a proxy that sets it (Vercel does),
  and counters are in memory, per process.
- **AI failures:** a provider error that escapes the fallback wrapper is `503 AI_UNAVAILABLE`
  (`ProviderError` is a `ServiceUnavailableError`); the message is generic, the cause is logged.
- **Unseeded database:** every route that needs the default user answers `503 NOT_SEEDED`,
  including `POST /meetings`.
- **Operation ids** are the handler names (`list_meetings`, `create_action_item`, ...), and tags
  are plural kebab-case (`action-items`, `summaries`).
- **Media:** `GET /meetings/{id}/media` streams the file and honours `Range` (206).
- **Tags:** names are unique ignoring case (`409 TAG_EXISTS`); `color_index` is 0-7.
  `PUT /meetings/{id}/tags` takes the complete set `{tag_ids}` (duplicates collapse, an unknown
  id is `422 TAG_NOT_FOUND`) and returns the updated meeting. Deleting a tag removes it from
  every meeting. `MeetingDetail.suggested_tags` is the meeting's top keywords not already
  applied as tags (no AI call on read).
- **Ask AI:** `POST /meetings/{id}/ask` `{question (1-500 chars)}` answers from that
  meeting's transcript (there is no conversation history in the contract yet; unknown fields
  are 422). `POST /search/ask` `{question, meeting_ids?}` answers from up to 40
  best transcript matches (any content word of the question, bm25 order) across live meetings,
  or only `meeting_ids`, plus those meetings' summary overviews. Both return
  `{answer, citations[{meeting_id, meeting_title, segment_id, start_ms, quote}], provider,
  model}`; a citation the provider makes up (a segment that was not among the passages) is
  dropped, and `start_ms` always comes from the database. Passages are read, the transaction is
  closed, and only then is the AI called. When there is nothing to answer from (a meeting with
  no transcript, or no matching lines across meetings) the answer is "I couldn't find that in
  this meeting." / "...in your meetings." with no citations and `provider: null`, returned before
  the rate limiter and without an AI call.
- **Comments:** listed oldest first; `body` 1-2000 chars; an optional `segment_id` must be a
  line of the same meeting (`422 SEGMENT_NOT_IN_MEETING`); the author is the current (default)
  user. `DELETE` hides the comment (`deleted_at`), after which it is `404`.
- **Highlights:** `{segment_id, start_offset, end_offset, color}` with
  `0 <= start_offset < end_offset <= length of the segment text` (`422 HIGHLIGHT_OUT_OF_RANGE`
  when past the text). Offsets and the length are **UTF-16 code units, matching JavaScript
  string indices** (an emoji counts as 2), so a browser selection's offsets can be sent as they
  are; the server measures with the same unit. `color` is `yellow|green|blue|pink|purple` (default `yellow`). Listed in transcript
  order.
- **Soundbites:** `{title?, start_ms, end_ms}`; length 3-180 s (`422 SOUNDBITE_LENGTH_INVALID`)
  and `end_ms <= duration_ms` (`422 SOUNDBITE_OUT_OF_RANGE`). Without a title, the first line
  spoken inside the clip is used. Listed in recording order.
- **Export:** `GET /meetings/{id}/export?format=md|txt|pdf&sections=summary,action_items,transcript`
  returns the file with `Content-Disposition: attachment; filename="<title-slug>-<date>.<ext>"`.
  `format` defaults to `md`, `sections` to all (rendered in that fixed order). OpenAPI lists
  `format` as an enum built from the exporter registry, so client types get a union. An unknown format
  is `422 EXPORT_FORMAT_UNSUPPORTED`, an unknown or empty section list
  `422 EXPORT_SECTION_UNKNOWN`. The PDF uses reportlab's built-in Helvetica, so characters
  outside Latin-1 do not render there.
- **Writes under a soft-deleted meeting** (comments, highlights, soundbites, tags, ask, export)
  are `410 MEETING_DELETED`, like every other child route.

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
| POST | `/meetings/{id}/ask` | 200 answer + citations | 404, 410, 422, 429, 503 |
| GET | `/meetings/{id}/comments` | 200 Page of comments | 404, 410, 422 |
| POST | `/meetings/{id}/comments` | 201 comment | 404, 410, 422, 503 |
| PATCH | `/comments/{id}` | 200 comment | 404, 410, 422 |
| DELETE | `/comments/{id}` | 204 | 404, 410, 422 |
| GET | `/meetings/{id}/highlights` | 200 Page of highlights | 404, 410, 422 |
| POST | `/meetings/{id}/highlights` | 201 highlight | 404, 410, 422, 503 |
| PATCH | `/highlights/{id}` | 200 highlight | 404, 410, 422 |
| DELETE | `/highlights/{id}` | 204 | 404, 410, 422 |
| GET | `/meetings/{id}/soundbites` | 200 Page of soundbites | 404, 410, 422 |
| POST | `/meetings/{id}/soundbites` | 201 soundbite | 404, 410, 422, 503 |
| DELETE | `/soundbites/{id}` | 204 | 404, 410, 422 |
| GET | `/meetings/{id}/export` | 200 file (md, txt or pdf) | 404, 410, 422 |
| PUT | `/meetings/{id}/tags` | 200 meeting | 404, 410, 422 |
| GET | `/tags` | 200 Page of tags | 422 |
| POST | `/tags` | 201 tag | 409, 422 |
| PATCH | `/tags/{id}` | 200 tag | 404, 409, 422 |
| DELETE | `/tags/{id}` | 204 | 404, 422 |
| GET | `/search?q=` | 200 Page of hits | 422 |
| POST | `/search/ask` | 200 answer + citations | 422, 429, 503 |
| GET | `/channels` | 200 Page of channels | 422 |
| POST | `/channels` | 201 channel | 409, 422 |
| PATCH | `/channels/{id}` | 200 channel | 404, 409, 422 |
| DELETE | `/channels/{id}` | 204 | 404, 422 |
| GET | `/me` | 200 user | 503 |
| GET | `/users` | 200 Page of users | 422 |
| GET | `/calendar-connections` | 200 Page of connections | 422, 503 |
| POST | `/calendar-connections` | 201 connection (200 if already connected) | 422, 503 |
| DELETE | `/calendar-connections/{provider}` | 204 | 404, 422, 503 |
| GET | `/feed` | 200 Page of feed items | 422, 503 |
| GET | `/notifications` | 200 Page of notifications, unread first | 422, 503 |
| PATCH | `/notifications/{id}` | 200 notification | 404, 422, 503 |
| POST | `/notifications/read-all` | 204 | 422, 503 |
| GET | `/me/usage` | 200 free-plan usage | 503 |
| PATCH | `/me` | 200 user | 422, 503 |
| PUT | `/me/onboarding` | 200 result | 422, 503 |
| DELETE | `/me/onboarding` | 204 | 503 |
| GET | `/action-items` | 200 Page of tasks | 422, 503 |
| POST | `/action-items` | 201 task | 404, 410, 422 |
| GET | `/integrations` | 200 Page of integrations | 422, 503 |
| GET | `/integrations/categories` | 200 Page of categories | 422 |
| PUT | `/integrations/{key}/connection` | 200 integration | 404, 422, 503 |
| DELETE | `/integrations/{key}/connection` | 204 | 404, 422, 503 |
| GET | `/chats` | 200 Page of chats | 422, 503 |
| POST | `/chats` | 201 chat + first exchange | 404, 410, 422, 429, 503 |
| GET | `/chats/{id}` | 200 chat with messages | 404, 422, 503 |
| DELETE | `/chats/{id}` | 204 | 404, 422, 503 |
| GET | `/chats/{id}/messages` | 200 Page of messages | 404, 422, 503 |
| POST | `/chats/{id}/messages` | 201 exchange | 404, 410, 422, 429, 503 |
| GET | `/chat-skills` | 200 skills | none |
| GET | `/analytics/overview` | 200 overview | 422 |
| GET | `/teams/me` | 200 team | 404, 503 |
| POST | `/teams` | 201 team | 409, 422, 503 |
| PATCH | `/teams/{id}` | 200 team | 403, 404, 422 |
| POST | `/teams/{id}/members` | 201 invites | 403, 404, 409, 422 |
| PATCH | `/team-members/{id}` | 200 member | 403, 404, 409, 422 |
| DELETE | `/team-members/{id}` | 204 | 403, 404, 409, 422 |
| POST | `/team-invites/{token}/accept` | 200 team | 404, 409 |

`GET /me` declares no 4xx: there is no authentication yet, the current user is the seeded default.

### Scheduling and Capture

`POST /meetings` also takes `status`:

- omitted: a finished meeting (upload, paste or manual), exactly as before.
- `"scheduled"`: needs `started_at` in the future (`422 SCHEDULED_IN_PAST` otherwise) and no
  `segments`. Takes `meeting_url`, `auto_join` and `language`.
- `"live"` (Capture): needs `meeting_url`, no `segments`; `started_at` is set to now and
  `source` to `capture`.

`GET /meetings?status=completed` (the default) lists finished meetings and live captures, so a
capture can be reopened from Home and the Meetings hub; `status=upcoming` lists scheduled
meetings that have not started.

`platform` is detected from the `meeting_url` host when omitted (`zoom.us` → zoom,
`meet.google.com` → meet, `teams.microsoft.com` → teams, anything else → other).
`meeting_url`, `platform` and `auto_join` without a `status` are a 422.

### Calendar connections (simulated)

There is no OAuth. Connecting a provider records it and imports three sample upcoming
meetings (`source: calendar`, description starts with "(demo import)"). Connecting again
returns the existing connection with 200 and imports nothing. Disconnecting soft-deletes only
the meetings that provider imported and the user has not edited since (an edit bumps
`updated_at` past `created_at`, which marks the meeting as the user's own).

### Feed and notifications

`GET /feed` is derived on read (no AI call): the first sentence of the newest summaries, open
action items assigned to the current user, and keywords raised by two or more meetings in the
last 7 days. Summaries and keywords span the whole (single-tenant) workspace.

Notifications are written after the action they report has committed, and writing one never
fails that action. Kinds: `meeting_created` (upload, paste or manual), `meeting_captured`
(a live Capture), `calendar_connected`, `summary_regenerated`, `action_item_assigned` (an item
newly assigned to a participant linked to the current user) and `invite_accepted` (emitted by
the Team flow through `NotificationService.notify_invite_accepted`).

### Tasks

`GET /action-items` lists tasks across meetings plus standalone ones (no meeting), soonest
due date first, undated last. Tasks of soft-deleted meetings are left out. Query:

- `scope`: `all` (default) or `mine` (assigned to me, created by me, or assigned to a participant
  linked to me).
- `status`: `open` or `completed`.
- `due`: `overdue`, `today`, `week` (the six days after today), `later` (after that) or `none`
  (no due date). Days are calendar days in `tz` (IANA zone, default `UTC`; unknown is
  `422 INVALID_TIMEZONE`).
- `q`: substring of the task text. Plus `page` and `page_size`.

`POST /action-items` creates a task; `meeting_id` is optional, and an unknown or deleted meeting is
`404` / `410`. Items have `assignee` (a participant of the meeting) and `assignee_user` (a user,
for standalone tasks). `PATCH` and `DELETE /action-items/{id}` work on both kinds.

### AskFred chats

A chat is a saved thread of messages. `POST /chats` `{question, meeting_id?, skill?}` creates the
thread, titled after the question, and answers it; `POST /chats/{id}/messages` asks a follow-up.
Both return `{thread, user_message, assistant_message}`. Messages carry `citations`
(`meeting_id`, `meeting_title`, `segment_id`, `start_ms`, `quote`), and the answering `provider`
and `model`. `meeting_id` is the `@meeting` context: summaries and questions focus on that
meeting (`404` / `410` when it is missing or deleted). `skill` is one of `ask` (default),
`summarize`, `action-items`, `prepare`, `digest`; when it is omitted the server picks one from the
wording (for example a leading "summarize"). `GET /chat-skills` lists them with their `/` command.
`GET /chats?q=` matches the title or any message and lists the most recently active first. The
question is saved first, the AI runs with no transaction open, and the answer is saved after, so a
failed AI call keeps the question. For a first message that means the thread already exists, so
retrying it creates a second thread (known limitation). As for the other AI routes, a 429 is only returned when the skill will
call the AI.

### Analytics

`GET /analytics/overview?range=7d|30d|90d|all&tz=` (default `30d`, `UTC`) returns totals
(meetings, duration, participants, action items created and completed, completion rate),
meetings per week (Monday start in `tz`), talk-time shares (top 8 plus one "other" row), top
keywords, an activity heatmap with the busiest weekday and hour, and counts by meeting source.
The window has no upper bound. It is computed on read with no AI call.

### Integrations (simulated)

`GET /integrations?category=&q=&connected=` returns the catalogue with the current user's
connection state; `/integrations/categories` returns categories with counts.
`PUT /integrations/{key}/connection` records a connection and `DELETE` removes it; both are
idempotent and an unknown key is `404`. Nothing is sent to the third party.

### Teams (simulated invites)

One team per user, enforced by the database. `POST /teams` makes the caller the owner (`409
TEAM_EXISTS` if they already belong to one); `GET /teams/me` is `404 NO_TEAM` without one.
Roles are `owner`, `admin`, `member`. Owners and admins invite with
`POST /teams/{id}/members` `{emails}`, which returns an invite link per new email and lists the
skipped ones; no email is sent. `POST /team-invites/{token}/accept` activates the seat for the
current (demo) user without any authentication. Only an owner can grant, revoke or remove
ownership; the last owner cannot be demoted or removed (`409 LAST_OWNER`); non-managers get `403`.
`GET /meetings?scope=shared` includes meetings hosted by an active teammate. `PATCH /me`
updates the name or job title; `PUT /me/onboarding` saves the onboarding answers (and can invite
co-workers); `GET /me/usage` returns free-plan meeting and storage figures.

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
