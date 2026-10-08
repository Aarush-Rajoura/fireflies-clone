# Database schema

SQLite, created only by Alembic migrations (`backend/alembic/versions`). Models live in
`backend/app/models`, one module per aggregate. The history is linear, one head:
`0001` → `0002` → `0003_onboarding` → `0004_home` → `0005_integrations` → `0006_tasks` →
`0007_chat` → `0008_team`. 24 tables plus the `transcript_fts` virtual table. The app applies
the migrations itself at startup (see ADR-012).

```mermaid
erDiagram
    users ||--o{ meetings : hosts
    users ||--o{ participants : "is (optional)"
    users ||--o{ channels : created_by
    users ||--o{ comments : author
    users ||--o{ highlights : created_by
    users ||--o{ soundbites : created_by
    users ||--o{ calendar_connections : connects
    users ||--o{ notifications : receives
    users ||--o{ user_tools : uses
    users ||--o{ integration_connections : connects
    users ||--o{ chat_threads : owns
    users ||--o{ action_items : "assignee / creator"
    users ||--o{ team_members : "seat (optional)"
    teams ||--o{ team_members : has
    chat_threads ||--o{ chat_messages : has
    chat_messages ||--o{ chat_citations : cites
    meetings ||--o{ chat_citations : cited
    meetings ||--o{ chat_threads : "context (optional)"
    channels ||--o{ meetings : groups
    meetings ||--o{ participants : has
    meetings ||--o{ speakers : has
    meetings ||--o{ transcript_segments : has
    meetings ||--o| summaries : has
    meetings ||--o{ keywords : has
    meetings ||--o{ action_items : has
    meetings ||--o{ comments : has
    meetings ||--o{ highlights : has
    meetings ||--o{ soundbites : has
    meetings ||--o{ meeting_tags : tagged
    tags ||--o{ meeting_tags : tagged
    participants ||--o{ speakers : "identified as"
    participants ||--o{ action_items : assignee
    speakers ||--o{ transcript_segments : speaks
    transcript_segments ||--o{ comments : on
    transcript_segments ||--o{ highlights : on
    summaries ||--o{ summary_sections : has

    users {
        int id PK
        string email UK
        string role
        string join_preference
        string recap_preference
        datetime onboarded_at
    }
    meetings {
        int id PK
        datetime started_at
        int duration_ms
        int host_id FK
        int channel_id FK
        string status
        string source
        string platform
        string calendar_provider
        datetime deleted_at
    }
    participants {
        int id PK
        int meeting_id FK
        int user_id FK
        string display_name
        int talk_ms
    }
    speakers {
        int id PK
        int meeting_id FK
        int participant_id FK
        string label
        int color_index
    }
    transcript_segments {
        int id PK
        int meeting_id FK
        int speaker_id FK
        int sequence
        int start_ms
        int end_ms
        string text
    }
    summaries {
        int id PK
        int meeting_id FK
        bool is_stale
    }
    summary_sections {
        int id PK
        int summary_id FK
        string kind
        int sequence
    }
    action_items {
        int id PK
        int meeting_id FK "nullable"
        int assignee_participant_id FK
        int assignee_user_id FK
        int created_by_user_id FK
        string status
        date due_date
    }
    tags {
        int id PK
        string name
    }
    meeting_tags {
        int meeting_id PK
        int tag_id PK
    }
    channels {
        int id PK
        string slug UK
    }
    comments {
        int id PK
        int meeting_id FK
        int segment_id FK
        int author_id FK
        datetime deleted_at
    }
    highlights {
        int id PK
        int meeting_id FK
        int segment_id FK
        int start_offset
        int end_offset
    }
    soundbites {
        int id PK
        int start_ms
        int end_ms
    }
    keywords {
        int id PK
        int meeting_id FK
        string term
    }
    calendar_connections {
        int id PK
        int user_id FK
        string provider
        datetime connected_at
    }
    user_tools {
        int id PK
        int user_id FK
        string tool
    }
    integration_connections {
        int id PK
        int user_id FK
        string integration_key
        datetime connected_at
    }
    chat_threads {
        int id PK
        int user_id FK
        string title
        int meeting_id FK
        datetime updated_at
    }
    chat_messages {
        int id PK
        int thread_id FK
        string role
        string skill
        string provider
        string model
    }
    chat_citations {
        int id PK
        int message_id FK
        int meeting_id FK
        int segment_id FK
        int start_ms
    }
    teams {
        int id PK
        string name
        int created_by FK
    }
    team_members {
        int id PK
        int team_id FK
        int user_id FK
        string email
        string role
        string status
        string invite_token UK
    }
    notifications {
        int id PK
        int user_id FK
        string kind
        string link
        datetime read_at
        datetime created_at
    }
```

`transcript_fts` is an FTS5 virtual table (external content over `transcript_segments`, rowid =
segment id), so it is not drawn as an ordinary table.

## Design decisions

- **Milliseconds as integers.** Every position or length in a recording (`start_ms`, `end_ms`,
  `duration_ms`, `talk_ms`) is an INTEGER, so there is no float drift or unit conversion.
  Wall-clock times are UTC. SQLite has no real timezone type and returns naive values, so
  every datetime column uses a `UTCDateTime` type: it rejects naive datetimes on write,
  converts aware ones to UTC, and returns aware UTC datetimes on read.
- **One home per content type.** Transcript text lives only in `transcript_segments`, summary
  prose only in `summaries` / `summary_sections`, keywords only in `keywords`, tasks only in
  `action_items`. Other tables point at them by id rather than copying their content.
- **Soft delete.** `meetings.deleted_at` and `comments.deleted_at` hide rows instead of removing
  them. Queries use `Meeting.not_deleted()`. Hard deletes (and the cascades below) only happen
  when a row is purged.
- **Denormalisations, all deliberate.**
  - `meetings.duration_ms`: set when the meeting is written, to the last transcript segment's
    `end_ms` (0 for a form meeting with no transcript); text edits never change it. Stored so
    lists and the `-duration_ms` sort need no segment scan.
  - `participants.talk_ms`: derivable from segments; stored so analytics needs no scan.
  - `action_items.completed_at`: redundant with `status = 'completed'`; records when.
  - `comments.meeting_id` and `highlights.meeting_id`: derivable via the segment; stored so
    per-meeting listing and the meeting cascade need no join.
- **Speakers indirection.** A transcript segment references a `speakers` row (a diarised label
  such as "Speaker 1"), and a speaker optionally maps to a `participants` row. Identifying a
  speaker is one update, and an unidentified voice still has a place.
- **Delete-rule policy.** Rows that make no sense without their meeting (or segment, summary,
  speaker) use `ON DELETE CASCADE`. Optional references to people (`participant_id`, `user_id`,
  `author_id`, `created_by`, `assignee_participant_id`) and `meetings.channel_id` use
  `SET NULL`, so removing a person or channel keeps the content. `meetings.host_id` is
  `RESTRICT`: a user who hosts meetings cannot be deleted. Foreign keys are enforced
  (`PRAGMA foreign_keys=ON` on every connection).
- **Constraints in the database.** Enums are VARCHAR with named CHECK constraints; time ranges,
  offsets and `color_index` have CHECKs; `(meeting_id, sequence)`, `(meeting_id, label)`,
  `(meeting_id, term)` and `(meeting_id, display_name)` are unique; tag names are unique
  case-insensitively through an index on `lower(name)`.
- **FTS joins back to meetings.** `transcript_fts` indexes only `transcript_segments.text`
  (porter stemming, unicode61). A hit's rowid is the segment id, so results join to
  `transcript_segments` and then to `meetings`, where `deleted_at` and other filters apply.
  Insert/update/delete triggers keep it in sync. A future migration that recreates
  `transcript_segments` must re-create those triggers.

- **Simulated calendar imports.** `calendar_connections` is unique per `(user_id, provider)`.
  Meetings a connection imports carry `meetings.calendar_provider`, so disconnecting
  soft-deletes exactly those, except imports the user has edited (imports are written with
  `updated_at == created_at`; an edit moves `updated_at` on). That column has no CHECK
  constraint (the ORM validates it):
  SQLite cannot drop a column named in one, and rebuilding `meetings` would lose its other
  CHECKs, so the migration adds and drops it in place.
- **Tasks without a meeting.** `action_items.meeting_id` is nullable so a standalone task can
  exist. `assignee_user_id` (a user) sits beside `assignee_participant_id` (a person in a
  meeting), and `created_by_user_id` records who made it; both user references are `SET NULL`
  and indexed. Due dates are plain dates, bucketed into overdue / today / week / later in the
  viewer's time zone at query time. The migration rebuilds the table in batch mode; its
  downgrade deletes standalone tasks.
- **Integrations.** `integration_connections` holds only `(user_id, integration_key)`, unique per
  pair. The catalogue itself lives in code, not in the database.
- **AskFred chats.** `chat_threads` (title, optional `meeting_id` context, `updated_at` moved on
  every exchange), `chat_messages` (role `user|assistant`, optional `skill`, and the answering
  `provider` and `model`) and `chat_citations`. A citation keeps its `quote` and `start_ms`
  even if its transcript line is removed (`segment_id` becomes null). Messages and citations
  cascade with the thread; a deleted meeting only clears the thread's context.
- **Teams.** `team_members` is both the invite and the seat: `status` is `invited` or `active`,
  `role` is `owner|admin|member`, and `invite_token` is unique. `user_id` stays null until the
  invite is accepted. A unique index on `user_id` allows one team per user (nulls repeat, so many
  pending invites are fine). A unique expression index on `(team_id, lower(email))` stops a
  duplicate invite. "Shared with me" matches a meeting's host to an active seat on the viewer's
  team.
- **Notifications.** `(user_id, read_at)` is indexed for the unread-first list and the bell's
  unread dot. Rows are written after the action they report has committed.

## Invariants enforced in the service layer

Composite foreign keys are not used, so the database does not stop a row pointing at another
meeting's data. Services must check each of these on write:

- `transcript_segments.speaker_id` refers to a speaker of the same `meeting_id`.
- `speakers.participant_id` refers to a participant of the same `meeting_id`.
- `action_items.assignee_participant_id` refers to a participant of the same `meeting_id`.
- `comments` and `highlights`: `(meeting_id, segment_id)` must match the segment's meeting
  (`422 SEGMENT_NOT_IN_MEETING`).
- `highlights`: offsets are UTF-16 code units (JavaScript string indices), and `end_offset` is
  at most the text's UTF-16 length when the highlight is written. Editing the
  segment text later does not move or trim highlights, so a client clamps ranges to the text.
- `highlights.color` is one of `yellow|green|blue|pink|purple` (checked by the request schema,
  not the database).
- `soundbites`: `3 s <= end_ms - start_ms <= 180 s` and `end_ms <= meetings.duration_ms`.
