import tempfile
import unittest

from pipeline.db import init_db, get_db
from pipeline.article_lifecycle import ArticleLifecycle


class TestArticleLifecycle(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db")
        init_db(self.tmp.name)
        self.conn = get_db(self.tmp.name)
        self.conn.execute(
            "INSERT INTO sources (id, name, type, url, enabled) VALUES (1,'S','rss','http://x',1)"
        )
        self.conn.execute(
            "INSERT INTO rss_articles (id, source_id, url, title, fetched_at) VALUES ('a1','1','http://x/1','T','2026-06-08')"
        )
        self.conn.commit()
        self.lifecycle = ArticleLifecycle(self.conn)

    def tearDown(self):
        self.conn.close()
        self.tmp.close()

    def test_transition_fresh_to_processed(self):
        self.lifecycle.transition("a1", "processed")
        row = self.conn.execute(
            "SELECT lifecycle_status, processed_at FROM rss_articles WHERE id='a1'"
        ).fetchone()
        self.assertEqual(row["lifecycle_status"], "processed")
        self.assertIsNotNone(row["processed_at"])

    def test_transition_fresh_to_discarded(self):
        self.lifecycle.discard("a1", reason="low_relevance", by="ai")
        row = self.conn.execute(
            "SELECT lifecycle_status, discard_reason, discarded_by FROM rss_articles WHERE id='a1'"
        ).fetchone()
        self.assertEqual(row["lifecycle_status"], "discarded")
        self.assertEqual(row["discard_reason"], "low_relevance")
        self.assertEqual(row["discarded_by"], "ai")

    def test_auto_discard_low_relevance(self):
        self.conn.execute(
            "UPDATE rss_articles SET relevance_score = 0.15 WHERE id = 'a1'"
        )
        self.conn.commit()
        discarded = self.lifecycle.auto_discard_stale()
        self.assertEqual(len(discarded), 1)
        row = self.conn.execute(
            "SELECT lifecycle_status FROM rss_articles WHERE id='a1'"
        ).fetchone()
        self.assertEqual(row["lifecycle_status"], "discarded")

    def test_auto_discard_skips_gray_zone(self):
        self.conn.execute(
            "UPDATE rss_articles SET relevance_score = 0.50 WHERE id = 'a1'"
        )
        self.conn.commit()
        discarded = self.lifecycle.auto_discard_stale()
        self.assertEqual(len(discarded), 0)

    def test_auto_discard_noise_types(self):
        self.conn.execute(
            "INSERT INTO article_digests (article_id, noise_type) VALUES ('a1', 'comparison_only')"
        )
        self.conn.commit()
        discarded = self.lifecycle.auto_discard_stale()
        self.assertEqual(len(discarded), 1)

    def test_get_articles_excludes_discarded(self):
        self.lifecycle.discard("a1", "test", "ai")
        articles = self.lifecycle.get_active_articles()
        self.assertEqual(len(articles), 0)

    def test_archive_old_articles(self):
        self.conn.execute(
            "UPDATE rss_articles SET lifecycle_status = 'processed', fetched_at = '2026-01-01' WHERE id = 'a1'"
        )
        self.conn.commit()
        archived = self.lifecycle.archive_stale(max_age_days=14)
        self.assertEqual(len(archived), 1)
        row = self.conn.execute(
            "SELECT lifecycle_status FROM rss_articles WHERE id='a1'"
        ).fetchone()
        self.assertEqual(row["lifecycle_status"], "archived")


if __name__ == "__main__":
    unittest.main()
