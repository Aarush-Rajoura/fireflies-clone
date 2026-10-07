.DEFAULT_GOAL := help
.PHONY: help install dev-backend dev-frontend migrate seed test lint types

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

install: ## Install backend and frontend dependencies
	cd backend && uv sync
	cd frontend && npm ci

dev-backend: ## Run the API with auto-reload on :8000
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend: ## Run the Next.js dev server on :3000
	cd frontend && npm run dev

migrate: ## Apply database migrations
	cd backend && uv run alembic upgrade head

seed: ## Populate demo data
	@echo "not available until the seed data exists"

test: ## Run backend and frontend tests
	cd backend && uv run pytest -q
	cd frontend && npm test

lint: ## Lint backend and frontend
	cd backend && uv run ruff check && uv run python ../scripts/check_layering.py
	cd frontend && npm run lint && npm run typecheck

types: ## Export docs/openapi.json (client type generation follows)
	cd backend && uv run python -m scripts.export_openapi
