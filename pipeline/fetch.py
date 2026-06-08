"""Standalone RSS fetcher — runs as a periodic cron job.

Fetches all enabled sources, persists articles to rss_articles,
and runs lifecycle cleanup.  Independent of AI processing.

Usage:
    python -m pipeline.fetch              # fetch all sources
    python -m pipeline.fetch --stale-only # only run lifecycle cleanup
"""

import argparse
import sys
from pathlib import Path

import feedparser

sys.path.insert(0, str(Path(__file__).parent))

from article_lifecycle import ArticleLifecycle, FRESH_MAX_DAYS, ARCHIVE_MAX_DAYS
from db import init_db, get_setting
from helpers import now_iso
from rss import fetch_rss_items
from health import write_health


def run_fetch(db_path: str | None = None, stale_only: bool = False):
    """Fetch RSS sources and persist to local SQLite.

    Args:
        db_path: override database path.
        stale_only: if True, skip fetching and only run lifecycle cleanup.
    """
    conn = init_db(db_path)
    now = now_iso()

    if stale_only:
        _run_lifecycle(conn)
        conn.close()
        return

    sources = conn.execute("SELECT * FROM sources WHERE enabled = 1").fetchall()
    if not sources:
        print("Fetch: no enabled sources")
        write_health(conn, "fetch", "ok", "no sources")
        conn.commit()
        conn.close()
        return

    print(f"Fetch: {len(sources)} sources")
    all_items, errors = fetch_rss_items(sources, conn, feedparser.parse)

    for src_name, err_msg in errors:
        print(f"  RSS error ({src_name}): {err_msg}")

    print(f"  Fetched {len(all_items)} items ({len(errors)} errors)")

    # Lifecycle cleanup
    _run_lifecycle(conn)

    # Health
    status = "ok" if not errors else "degraded"
    write_health(conn, "fetch", status, f"{len(all_items)} items, {len(errors)} errors")
    conn.commit()
    conn.close()


def _run_lifecycle(conn):
    """Run lifecycle transitions: fresh→processed→archived, discard noise."""
    lifecycle = ArticleLifecycle(conn)
    discarded = lifecycle.auto_discard_stale()
    archived = lifecycle.archive_stale()
    stale_count = _mark_stale_articles(conn)
    stats = lifecycle.get_stats()
    if discarded or archived or stale_count:
        print(f"  Lifecycle: discarded {len(discarded)}, "
              f"stale {stale_count}, archived {len(archived)}")
        print(f"  Stats: {stats}")


def _mark_stale_articles(conn) -> int:
    """Transition fresh articles older than FRESH_MAX_DAYS to processed.

    'processed' means: not new anymore, but still searchable.
    Articles stay in DB, just status changes.
    """
    conn.execute(
        """
        UPDATE rss_articles
        SET lifecycle_status = 'processed',
            processed_at = ?
        WHERE lifecycle_status = 'fresh'
          AND julianday('now') - julianday(fetched_at) > ?
        """,
        (now_iso(), FRESH_MAX_DAYS),
    )
    conn.commit()
    return conn.total_changes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Argus RSS fetcher")
    parser.add_argument("--db", default=None, help="Database path override")
    parser.add_argument("--stale-only", action="store_true",
                        help="Only run lifecycle cleanup, skip fetching")
    args = parser.parse_args()
    run_fetch(db_path=args.db, stale_only=args.stale_only)
