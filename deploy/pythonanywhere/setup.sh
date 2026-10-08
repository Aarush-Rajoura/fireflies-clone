#!/usr/bin/env bash
# One-time (and repeatable) deploy of the FastAPI backend on a PythonAnywhere free account.
# Run inside a PythonAnywhere Bash console:
#   bash <(curl -fsSL https://raw.githubusercontent.com/Aarush-Rajoura/fireflies-clone/build/deploy/pythonanywhere/setup.sh)
set -euo pipefail

BRANCH="${BRANCH:-build}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://fireflies-clone-rr8h.vercel.app}"
USER_NAME="$(whoami)"
DOMAIN="$(echo "$USER_NAME" | tr '[:upper:]' '[:lower:]').pythonanywhere.com"
REPO="$HOME/fireflies-clone"
DATA="$HOME/fireflies-data"          # SQLite lives here: outside the repo, survives redeploys
VENV="$HOME/.virtualenvs/fireflies"
PY="$(command -v python3.13 || command -v python3.12)"

echo "==> Code ($BRANCH)"
if [ -d "$REPO/.git" ]; then git -C "$REPO" fetch -q origin && git -C "$REPO" checkout -q "$BRANCH" && git -C "$REPO" reset -q --hard "origin/$BRANCH"
else git clone -q -b "$BRANCH" https://github.com/Aarush-Rajoura/fireflies-clone.git "$REPO"; fi

echo "==> Virtualenv ($PY)"
[ -d "$VENV" ] || "$PY" -m venv "$VENV"
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r "$REPO/backend/requirements.txt"

echo "==> Settings"
mkdir -p "$DATA"
ENV_FILE="$REPO/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<ENVEOF
DATABASE_URL=sqlite:///$DATA/fireflies.db
CORS_ORIGINS=$FRONTEND_ORIGIN
SQLITE_JOURNAL_MODE=delete
AI_PROVIDER=mock
AI_API_KEY=
MEDIA_DIR=$REPO/backend/media
ENVEOF
  echo "   wrote $ENV_FILE (edit it to set AI_PROVIDER=gemini and AI_API_KEY)"
fi
# Consoles and the web app run on different machines here, so WAL would lose writes.
grep -q '^SQLITE_JOURNAL_MODE=' "$ENV_FILE" || echo "SQLITE_JOURNAL_MODE=delete" >> "$ENV_FILE"

echo "==> Website ($DOMAIN)"
CMD="$VENV/bin/uvicorn --app-dir $REPO/backend --uds \${DOMAIN_SOCKET} app.main:app"
if pa website get --domain "$DOMAIN" >/dev/null 2>&1; then
  pa website reload --domain "$DOMAIN"
else
  pa website create --domain "$DOMAIN" --command "$CMD"
fi

echo "==> Database"
# The web app migrates its own database on startup. It runs on another machine than this
# console, so migrating from here fails ("database is locked") or does not stick.
# Wake it and wait until it answers before seeding.
for _ in $(seq 1 30); do
  curl -fsS -o /dev/null "https://$DOMAIN/api/health" && break
  sleep 2
done
# Fails loudly: a broken seed must stop the deploy, not leave an empty demo behind.
# --if-empty also (re)generates the sample recording in MEDIA_DIR when it is missing.
(cd "$REPO/backend" && "$VENV/bin/python" -m app.seed.seed --if-empty)
# Seeded "upcoming" meetings drift into the past; move them back to their future offsets.
(cd "$REPO/backend" && "$VENV/bin/python" -m app.seed.seed --refresh-upcoming)
echo "==> Done: https://$DOMAIN/api/health"
