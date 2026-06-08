"""Test standalone RSS fetcher (pipeline/fetch.py)."""

import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import feedparser

from pipeline.db import init_db
import pipeline.fetch as fetch_module


class TestFetch(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        self.tmp.close()
        self.conn = init_db(self.tmp.name)
        # Seed minimal source
        self.conn.execute(
            "INSERT INTO sources (id, name, type, url, enabled) "
            "VALUES (1, 'TestFeed', 'rss', 'http://example.com/rss', 1)"
        )
        self.conn.commit()

    def tearDown(self):
        self.conn.close()
        for suffix in ("", "-wal", "-shm"):
            path = self.tmp.name + suffix
            if os.path.exists(path):
                os.unlink(path)

    def test_run_fetch_stores_articles(self):
        """Fetch should store RSS entries into rss_articles."""
        old_parse = feedparser.parse

        def fake_parse(_content):
            return SimpleNamespace(entries=[
                {
                    "title": "Test Article",
                    "link": "http://example.com/article1",
                    "summary": "A test article summary",
                    "published": "2026-06-08T00:00:00+00:00",
                }
            ])

        mock_resp = MagicMock()
        mock_resp.content = b"<rss></rss>"
        mock_resp.raise_for_status = MagicMock()

        feedparser.parse = fake_parse
        with patch("pipeline.rss.requests.get", return_value=mock_resp):
            try:
                fetch_module.run_fetch(db_path=self.tmp.name)
            finally:
                feedparser.parse = old_parse

        row = self.conn.execute("SELECT * FROM rss_articles").fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row["title"], "Test Article")
        self.assertEqual(row["lifecycle_status"], "fresh")

    def test_stale_only_skips_fetch(self):
        """--stale-only should not fetch, only run lifecycle."""
        old_parse = feedparser.parse
        feedparser.parse = None  # Should not be called

        try:
            fetch_module.run_fetch(db_path=self.tmp.name, stale_only=True)
        finally:
            feedparser.parse = old_parse

        # No articles should exist
        count = self.conn.execute("SELECT COUNT(*) FROM rss_articles").fetchone()[0]
        self.assertEqual(count, 0)

    def test_lifecycle_marks_old_fresh_as_processed(self):
        """Fresh articles older than 3 days should become processed."""
        # Insert an old article (5 days ago)
        old_date = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        self.conn.execute(
            """INSERT INTO rss_articles
               (id, source_id, url, title, snippet, fetched_at, lifecycle_status)
               VALUES ('old1', '1', 'http://x/1', 'Old Article', 'snippet', ?, 'fresh')""",
            (old_date,),
        )
        # Insert a recent article (1 day ago)
        recent_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        self.conn.execute(
            """INSERT INTO rss_articles
               (id, source_id, url, title, snippet, fetched_at, lifecycle_status)
               VALUES ('new1', '1', 'http://x/2', 'Recent Article', 'snippet', ?, 'fresh')""",
            (recent_date,),
        )
        self.conn.commit()

        fetch_module.run_fetch(db_path=self.tmp.name, stale_only=True)

        old_row = self.conn.execute(
            "SELECT lifecycle_status FROM rss_articles WHERE id = 'old1'"
        ).fetchone()
        new_row = self.conn.execute(
            "SELECT lifecycle_status FROM rss_articles WHERE id = 'new1'"
        ).fetchone()

        self.assertEqual(old_row["lifecycle_status"], "processed")
        self.assertEqual(new_row["lifecycle_status"], "fresh")

    def test_health_written(self):
        """Fetch should write health status."""
        mock_resp = MagicMock()
        mock_resp.content = b"<rss></rss>"
        mock_resp.raise_for_status = MagicMock()

        old_parse = feedparser.parse
        feedparser.parse = lambda _: SimpleNamespace(entries=[])

        with patch("pipeline.rss.requests.get", return_value=mock_resp):
            try:
                fetch_module.run_fetch(db_path=self.tmp.name)
            finally:
                feedparser.parse = old_parse

        row = self.conn.execute(
            "SELECT * FROM health WHERE module = 'fetch'"
        ).fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row["status"], "ok")


if __name__ == "__main__":
    unittest.main()
