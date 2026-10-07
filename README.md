# Fireflies.ai Clone

A clone of Fireflies.ai for meeting transcripts, summaries and action items, built as a monorepo with a Next.js (TypeScript) frontend and a FastAPI backend on SQLite. This README is a skeleton; each section is filled in by the module that builds the matching feature.

## Overview

_To be completed in the module that delivers it._

## Live demo

_To be completed in the module that delivers it._

## Features vs brief

_To be completed in the module that delivers it._

## Tech stack

**Backend**
- Python 3.12, FastAPI, Pydantic v2 and pydantic-settings
- SQLAlchemy 2.0 with Alembic migrations on SQLite (WAL, foreign keys on)
- `uv` for dependencies; `pytest`, `ruff` and `mypy --strict` for checks

**Frontend**
- Next.js with TypeScript (strict) and Tailwind CSS v3 (scaffolded; features are planned)

## Architecture

### Backend

```
HTTP request
   |
   v
core/middleware  (request id, logging)  ->  core/errors  (error envelope)
   |
   v
api/v1/routers   translate HTTP only                    [health exists; rest planned]
   |
   v
services         use-case rules, one commit per use case [planned]
   |
   v
repositories     queries, flush only                     [planned]
   |
   v
models (db/)     SQLAlchemy models on a shared Base
```

- `core/`: `Settings` (the only place env vars are read), domain exceptions with no HTTP knowledge, and the single mapping from exceptions to the `{error: {code, message, details}}` envelope.
- `db/`: engine and session factory built from settings, and a `UnitOfWork` that owns the transaction boundary. Services will receive a `UnitOfWork`, never a raw engine.
- `main.py`: `create_app(settings)` wires CORS, middleware, handlers and routers, so tests can build an app against their own database.
- Schema changes go through Alembic only; the app never calls `create_all()`.

## Database schema

SQLite managed by Alembic migrations (never `create_all()`): meetings with their participants,
speakers, transcript segments, summaries, action items, tags, comments, highlights, soundbites
and channels, plus an FTS5 index over transcript text. Durations are integer milliseconds,
meetings are soft-deleted, and delete rules are `CASCADE` for owned content, `SET NULL` for
optional people/channel references and `RESTRICT` for a meeting's host. See the ER diagram and
design decisions in [docs/schema.md](docs/schema.md).

## API overview

_To be completed in the module that delivers it._

## Setup

_To be completed in the module that delivers it._

## Assumptions

_To be completed in the module that delivers it._

## What's next

_To be completed in the module that delivers it._

