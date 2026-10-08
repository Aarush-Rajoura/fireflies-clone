# Architecture decisions

Short records of choices that shape the codebase. Add a new ADR when a decision would be costly to reverse or likely to be questioned later.

## Template

### ADR-NNN: Title

- **Context:** what forces are at play.
- **Decision:** what we chose.
- **Why:** the reasoning and alternatives rejected.
- **Consequences:** what becomes easier or harder.

## ADR-001: Monorepo with frontend/ and backend/, FastAPI + SQLite + Next.js per assignment

- **Context:** the assignment asks for a Fireflies.ai clone with a web UI and an API backed by a database.
- **Decision:** one repository with `frontend/` (Next.js, TypeScript) and `backend/` (FastAPI, SQLite), tied together by a root Makefile and one CI workflow.
- **Why:** the stack is prescribed by the assignment; a single repo keeps API changes and client changes in one commit and one review. SQLite needs no extra service to run locally.
- **Consequences:** one setup flow for reviewers. SQLite has a single writer, so long work (such as AI calls) must stay outside write transactions.

## ADR-002: Repository layer + Unit of Work

- **Context:** routers, services and queries would otherwise share one SQLAlchemy session freely, so transaction boundaries and query code end up everywhere.
- **Decision:** `app/repositories/` hold all query code (they only `flush`); a `UnitOfWork` (`app/db/unit_of_work.py`) owns the session, exposes one repository per aggregate and is the only thing that commits. A service method is one use case and commits once. `app/core/deps.py` is the composition root: it opens the UoW per request and builds services (it is the one module allowed to import services and `app.ai`).
- **Why:** services read as business rules, not SQL; tests swap a real migrated SQLite in without mocks; a failed use case rolls back as a whole. A generic "repository for everything" or active-record models were rejected as hiding the transaction boundary.
- **Consequences:** a little boilerplate per aggregate. `scripts/check_layering.py` keeps `app/api` from importing models, db, repositories or SQLAlchemy, and `app/services` from importing FastAPI.

## ADR-003: AI capability interfaces + result-carried provenance

- **Context:** the mock (offline, deterministic) and Gemini must be interchangeable, with a fallback when the LLM fails, and the UI must say honestly which one produced a summary.
- **Decision:** services depend on one small protocol each (`Summarizer`, `ActionItemExtractor`, `QuestionAnswerer` in `app/ai/interfaces.py`); providers are composed as cache -> fallback(primary, mock). Provenance travels on the result (`SummaryResult.provider/model`) rather than being read off the provider object; a fallback result is re-stamped `mock (llm fallback)`. `ProviderError` is a `ServiceUnavailableError` (503 `AI_UNAVAILABLE`) when nothing catches it.
- **Why:** with a fallback in the chain, "which provider am I configured with" and "who answered" differ; only the result knows. Narrow protocols keep test doubles tiny.
- **Consequences:** every provider must fill `provider`/`model` on its results; action items carry no provenance.

## ADR-004: AI outside write transactions + regenerate claim tokens

- **Context:** SQLite has a single writer, and an LLM call can take seconds. Two clicks on "Regenerate" must not both run and overwrite each other.
- **Decision:** AI calls never run inside a write transaction. Creation does cheap pre-checks, rolls back, calls the AI, then writes everything in one short transaction. Regeneration claims the summary first (`generating_since = token`, committed), calls the AI with no transaction open, then writes only if it still owns the claim; a claim older than two minutes counts as abandoned. The AI rate limit is checked after every guard, inside the claim transaction, so a rejected request is never counted and a 429 leaves no claim behind.
- **Why:** holding the write lock across a network call would stall every other writer; a version column would only detect the lost update after paying for both AI calls.
- **Consequences:** a concurrent regenerate gets `409 SUMMARY_GENERATING`; the detail view shows `summary_status: generating`.

## ADR-005: Transcript previews as a resource

- **Context:** importing a transcript is "parse, let the user check speakers, then save"; a verb endpoint like `/parse` or a create that guesses would hide that step.
- **Decision:** `POST /transcript-previews` (JSON text) and `POST /transcript-previews/files` (multipart) return a normalised, unsaved preview (segments, speakers, warnings); the client sends the segments back in `POST /meetings`. Nothing is stored by a preview.
- **Why:** keeps REST nouns, gives each input a precise OpenAPI schema, and lets the UI show warnings (estimated timings, split long lines) before anything is written.
- **Consequences:** a transcript crosses the wire twice; size limits apply to both paths.

## ADR-006: Flat bm25 search hits

- **Context:** global search must rank transcript matches and link straight to the moment in a meeting.
- **Decision:** `GET /search` returns a flat page of segment hits ordered by FTS5 `bm25`, each with meeting id/title, speaker, `start_ms`, a snippet and match `ranges` (character offsets the client wraps; never raw HTML), not hits grouped per meeting.
- **Why:** bm25 ranks segments, so a flat list preserves relevance and pagination stays exact; grouping can be done by the client for display. The meeting list's `q` reuses the same safe query builder for its transcript clause.
- **Consequences:** one meeting can appear several times in a page of hits.

## ADR-007: Soft delete + 410 Gone

- **Context:** deleting a meeting should be undoable, and a stale link should say "deleted" rather than "never existed".
- **Decision:** meetings have `deleted_at`; lists filter it out, and every route on a deleted meeting (or its children) answers `410 MEETING_DELETED`; `POST /meetings/{id}/restore` undoes it.
- **Why:** an undo toast needs the row to still exist; 410 lets the client offer "restore" instead of a generic 404.
- **Consequences:** every query must filter `deleted_at` (centralised in `Meeting.not_deleted()` and the FTS join); the FTS index still holds deleted meetings' text.

## ADR-008: SQLite + FTS5 on PythonAnywhere

- **Context:** free hosting only; the brief mandates SQLite.
- **Decision:** the API runs on a PythonAnywhere free web app with the SQLite file on its persistent disk, outside the repo (`~/fireflies-data/`); WAL, foreign keys and FTS5 (porter, unicode61) with triggers. `deploy/pythonanywhere/setup.sh` migrates, seeds `--if-empty`, refreshes the seeded upcoming meetings and reloads.
- **Why:** hosts with ephemeral disks would lose user edits on every restart; PythonAnywhere keeps the file, and SQLite's FTS5 gives ranked search with no extra service.
- **Consequences:** one process, one writer: rate-limit counters are in memory, AI calls stay outside write transactions (ADR-004). Moving to Postgres would mean replacing the FTS5 queries.

## ADR-009: Dark-default theme (frontend)

- **Context:** the current Fireflies app (per the reference screenshots) is dark by default, and dark mode is a bonus item.
- **Decision:** design tokens are CSS variables with the dark palette as the default and a light theme as the alternative, toggled from the profile menu.
- **Why:** matching the real product's look is graded; building on tokens from day one makes the toggle a variable swap rather than a restyle.
- **Consequences:** every component must use tokens, never raw colours. Status: the app shell that carries the toggle is still being built; the backend is unaffected.

## ADR-010: Export through an exporter registry

- **Context:** meetings export to Markdown, plain text and PDF today, and more formats (DOCX, SRT) are likely; a `match format:` in the service would have to change for each one.
- **Decision:** `app/services/export/` loads one format-neutral `ExportBundle` (only the sections asked for) and hands it to an `Exporter` (`media_type`, `extension`, `render(bundle) -> bytes`) looked up by name in an `ExporterRegistry`. The composition root builds the registry with `md`, `txt` and `pdf`; an unknown name is `422 EXPORT_FORMAT_UNSUPPORTED`, listing the supported ones. Filenames are a whitelist slug of the title plus the meeting date.
- **Why:** open for extension, closed for modification: a new format is one class and one `register` call, with no service or router change. Exporters never touch the database, so each is tested on a hand-built bundle.
- **Consequences:** `format` is a free string in OpenAPI (its description lists the formats) rather than an enum. Files are rendered in memory, which is fine for meeting-sized documents. The PDF uses built-in fonts, so non-Latin-1 text does not render in it.

## ADR-011: Cross-meeting Ask over FTS hits

- **Context:** the Meetings hub's Ask panel answers questions across many meetings; sending every transcript to the model is too large and too slow.
- **Decision:** `POST /search/ask` retrieves passages with FTS5: the question's content words (question glue dropped) are OR-ed into a safe quoted query, the best 40 segments by bm25 across live meetings (optionally only `meeting_ids`) become passages, followed by those meetings' summary overviews. The same `QuestionAnswerer` serves this and the single-meeting `POST /meetings/{id}/ask` (whose passages are the meeting's lines). In both, passages are read in a short transaction that is closed before the AI call, and only citations that point at a supplied segment survive, with `start_ms` taken from the database.
- **Why:** reuses the existing index and capability interface with no new infrastructure; OR-ing content words finds relevant lines where the AND query used by `/search` would find none for a whole sentence.
- **Consequences:** retrieval is lexical: a question phrased with words that never occur in the transcript finds nothing (the answer then says so). Conversation `history` is accepted but not used yet.
