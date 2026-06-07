import tempfile
import sqlite3
import unittest

from pipeline.db import init_db


class TestRssArticlesSchema(unittest.TestCase):
    def test_rss_articles_table_exists(self):
        with tempfile.NamedTemporaryFile(suffix=".db") as f:
            init_db(f.name)
            conn = sqlite3.connect(f.name)
            conn.row_factory = sqlite3.Row
            cols = {
                r[1]
                for r in conn.execute("PRAGMA table_info(rss_articles)").fetchall()
            }
            conn.close()
            required = {
                "id", "source_id", "url", "title", "snippet", "content_text",
                "published_at", "fetched_at", "hash", "language", "lifecycle_status",
                "relevance_score", "importance_score", "summary_short", "summary_long",
                "discard_reason", "discarded_at", "discarded_by",
            }
            self.assertTrue(required.issubset(cols), f"Missing: {required - cols}")


class TestArticleFtsVirtualTable(unittest.TestCase):
    def test_article_fts_virtual_table(self):
        with tempfile.NamedTemporaryFile(suffix=".db") as f:
            init_db(f.name)
            conn = sqlite3.connect(f.name)
            tables = {
                r[0]
                for r in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            }
            conn.close()
            self.assertIn("article_fts", tables)


class TestArticleDigestsSchema(unittest.TestCase):
    def test_article_digests_table(self):
        with tempfile.NamedTemporaryFile(suffix=".db") as f:
            init_db(f.name)
            conn = sqlite3.connect(f.name)
            conn.row_factory = sqlite3.Row
            cols = {
                r[1]
                for r in conn.execute("PRAGMA table_info(article_digests)").fetchall()
            }
            conn.close()
            required = {
                "article_id", "summary_short", "summary_long", "key_points",
                "entities", "about_members", "noise_type", "relevance_score",
            }
            self.assertTrue(required.issubset(cols), f"Missing: {required - cols}")


if __name__ == "__main__":
    unittest.main()
