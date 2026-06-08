#!/usr/bin/env bash
# Argus — one-command start
# No .env needed. Configure models in the Settings page after launch.
set -e
cd "$(dirname "$0")"

# ── Kill stale processes on our ports ──
for port in 8000 5173; do
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "▸ Killing stale process on :$port (pid $pid)"
    kill -9 $pid 2>/dev/null || true
  fi
done

# ── Start Docker services (SearXNG) ──
if command -v docker &>/dev/null; then
  if docker info &>/dev/null; then
    echo "▸ Starting SearXNG…"
    docker compose up -d searxng 2>/dev/null || true
    # Wait for SearXNG to be ready
    for i in $(seq 1 15); do
      if curl -sf http://localhost:8080/healthz &>/dev/null; then
        echo "  SearXNG ready."
        break
      fi
      sleep 1
    done
  else
    echo "▸ Docker not running — skipping SearXNG (start Colima or Docker first)"
  fi
else
  echo "▸ Docker not found — skipping SearXNG"
fi

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

# ── Seed DB (idempotent: creates tables, seeds data, generates snapshot, refreshes health) ──
echo "▸ Seeding database…"
python3 pipeline/seed.py

# ── Frontend deps ──
if [ ! -d "web/node_modules" ]; then
  echo "▸ Installing frontend dependencies…"
  cd web && npm install && cd ..
fi

# ── Start ──
trap 'kill 0 2>/dev/null' EXIT INT TERM

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

python3 -m uvicorn api.api:app --host 127.0.0.1 --port 8000 &
cd web && npx vite --host 127.0.0.1 &

wait
