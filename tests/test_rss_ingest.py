import tempfile
import unittest

from pipeline.db import init_db, get_db
from pipeline.rss import fetch_rss_items


class TestRssIngest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db")
        init_db(self.tmp.name)
        self.conn = get_db(self.tmp.name)
        # Insert a test source (id is INTEGER PRIMARY KEY, no enabled column)
        self.conn.execute(
            "INSERT INTO sources (name, type, url) VALUES (?, ?, ?)",
            ("Test Source", "rss", "https://example.com/feed.xml"),
        )
        self.conn.commit()
        self.source_id = self.conn.execute("SELECT last_insert_rowid()").fetchone()[0]

    def tearDown(self):
        self.conn.close()
        self.tmp.close()

    def test_writes_articles_to_db(self):
        fake_entries = [
            {"title": "Article 1", "link": "https://example.com/1", "summary": "Summary 1"},
            {"title": "Article 2", "link": "https://example.com/2", "summary": "Summary 2"},
        ]

        class FakeFeed:
            entries = fake_entries
            feed = {}

        def fake_parse(url):
            return FakeFeed()

        sources = [{"id": self.source_id, "url": "https://example.com/feed.xml", "name": "Test"}]
        items, errors = fetch_rss_items(sources, self.conn, fake_parse)

        # Verify articles written to rss_articles
        rows = self.conn.execute("SELECT * FROM rss_articles").fetchall()
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["title"], "Article 1")
        self.assertEqual(rows[0]["lifecycle_status"], "fresh")

    def test_deduplicates_by_url(self):
        fake_entries = [{"title": "Same", "link": "https://example.com/same", "summary": "S"}]

        class FakeFeed:
            entries = fake_entries
            feed = {}

        def fake_parse(url):
            return FakeFeed()

        sources = [{"id": self.source_id, "url": "https://example.com/feed.xml", "name": "Test"}]
        # Fetch twice
        fetch_rss_items(sources, self.conn, fake_parse)
        fetch_rss_items(sources, self.conn, fake_parse)

        rows = self.conn.execute("SELECT * FROM rss_articles").fetchall()
        self.assertEqual(len(rows), 1)  # Deduped by UNIQUE url

    def test_fts_index_populated(self):
        fake_entries = [
            {
                "title": "AI Breakthrough",
                "link": "https://example.com/ai",
                "summary": "New model released",
            }
        ]

        class FakeFeed:
            entries = fake_entries
            feed = {}

        def fake_parse(url):
            return FakeFeed()

        sources = [{"id": self.source_id, "url": "https://example.com/feed.xml", "name": "Test"}]
        fetch_rss_items(sources, self.conn, fake_parse)

        # Search FTS
        fts_rows = self.conn.execute(
            "SELECT * FROM article_fts WHERE article_fts MATCH 'breakthrough'"
        ).fetchall()
        self.assertEqual(len(fts_rows), 1)

    def test_updates_source_health(self):
        class FakeFeed:
            entries = []
            feed = {}

        def fake_parse(url):
            return FakeFeed()

        sources = [{"id": self.source_id, "url": "https://example.com/feed.xml", "name": "Test"}]
        fetch_rss_items(sources, self.conn, fake_parse)

        row = self.conn.execute(
            "SELECT health_status, last_fetched_at FROM sources WHERE id=?",
            (self.source_id,),
        ).fetchone()
        self.assertIsNotNone(row["last_fetched_at"])


if __name__ == "__main__":
    unittest.main()
