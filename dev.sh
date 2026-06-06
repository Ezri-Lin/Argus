#!/usr/bin/env bash
# Argus dev — start backend + frontend in parallel
# Usage: ./dev.sh

trap 'kill 0' EXIT

echo "▸ Starting backend (uvicorn :8000)…"
cd "$(dirname "$0")" && python3 -m uvicorn api.api:app --reload --port 8000 &

echo "▸ Starting frontend (vite :5173)…"
cd "$(dirname "$0")/web" && npm run dev &

wait
