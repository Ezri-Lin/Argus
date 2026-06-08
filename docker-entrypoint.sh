#!/bin/sh
set -e

# Always seed on startup (idempotent: creates tables, seeds data, refreshes health)
if [ -f "pipeline/watchlist.json" ]; then
    echo "▸ Seeding database from pipeline/watchlist.json …"
    python pipeline/seed.py
fi

exec "$@"
