#!/bin/sh
set -e

DB_PATH="${ARGUS_DB_PATH:-data/argus.db}"

# Auto-seed on first run if watchlist.json exists
if [ ! -f "$DB_PATH" ] && [ -f "pipeline/watchlist.json" ]; then
    echo "▸ First run: seeding database from pipeline/watchlist.json …"
    python pipeline/seed.py
fi

exec "$@"
