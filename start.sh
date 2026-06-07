#!/usr/bin/env bash
# Argus — one-command start
# No .env needed. Configure models in the Settings page after launch.
set -e
cd "$(dirname "$0")"

# ── Check Python ──
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 not found. Install Python 3.10+ first."
  exit 1
fi

# ── Check pip deps ──
if ! python3 -c "import fastapi" &>/dev/null; then
  echo "▸ Installing Python dependencies…"
  pip3 install -r pipeline/requirements.txt
fi

# ── Init DB (create tables only, no seed data) ──
mkdir -p data
python3 -c "
import sys; sys.path.insert(0, 'pipeline')
from db import init_db
init_db()
print('  DB initialized.')
"

# ── Frontend deps ──
if [ ! -d "web/node_modules" ]; then
  echo "▸ Installing frontend dependencies…"
  cd web && npm install && cd ..
fi

# ── Start ──
trap 'kill 0' EXIT

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║           Argus is starting          ║"
echo "  ╠══════════════════════════════════════╣"
echo "  ║  Backend:  http://localhost:8000     ║"
echo "  ║  Frontend: http://localhost:5173     ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  → Open http://localhost:5173 in your browser"
echo "  → Go to Settings → Models to add your LLM API key"
echo "  → Pipeline runs automatically every 60 minutes"
echo ""

python3 -m uvicorn api.api:app --reload --port 8000 &
cd web && npm run dev &

wait
