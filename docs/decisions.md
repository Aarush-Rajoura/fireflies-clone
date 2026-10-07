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
