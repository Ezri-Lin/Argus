import tempfile, unittest, json
from pipeline.db import init_db, get_db
from pipeline.digest_cache import DigestCache


class TestDigestCache(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db")
        init_db(self.tmp.name)
        self.conn = get_db(self.tmp.name)
        self.conn.execute(
            "INSERT INTO sources (id, name, type, url, enabled) VALUES (1,'S','rss','http://x',1)"
        )
        self.conn.execute("""
            INSERT INTO rss_articles (id, source_id, url, title, fetched_at, lifecycle_status)
            VALUES ('a1','1','http://x/1','Test Article','2026-06-08','fresh')
        """)
        self.conn.commit()
        self.cache = DigestCache(self.conn)

    def tearDown(self):
        self.conn.close()
        self.tmp.close()

    def test_save_and_retrieve_digest(self):
        self.cache.save("a1", summary_short="Short", summary_long="Long text",
                       relevance_score=0.85, noise_type=None)
        digest = self.cache.get("a1")
        self.assertIsNotNone(digest)
        self.assertEqual(digest["summary_short"], "Short")
        self.assertEqual(digest["relevance_score"], 0.85)

    def test_choose_payload_prefers_digest(self):
        self.cache.save("a1", summary_short="Short digest", relevance_score=0.80)
        article = {"id": "a1", "content_text": "Full article text", "should_reread": 0}
        payload = self.cache.choose_payload(article)
        self.assertEqual(payload, "Short digest")

    def test_choose_payload_reads_full_when_reread(self):
        self.cache.save("a1", summary_short="Short", relevance_score=0.80)
        article = {"id": "a1", "content_text": "Full text", "should_reread": 1}
        payload = self.cache.choose_payload(article)
        self.assertEqual(payload, "Full text")

    def test_choose_payload_reads_full_when_no_digest(self):
        article = {"id": "a1", "content_text": "Full text", "should_reread": 0}
        payload = self.cache.choose_payload(article)
        self.assertEqual(payload, "Full text")

    def test_choose_payload_reads_full_for_important(self):
        self.cache.save("a1", summary_short="Short", importance_score=0.80)
        article = {"id": "a1", "content_text": "Full text", "should_reread": 0}
        payload = self.cache.choose_payload(article)
        self.assertEqual(payload, "Full text")

    def test_mark_reread(self):
        self.cache.save("a1", summary_short="Short")
        self.cache.mark_reread("a1")
        row = self.conn.execute("SELECT should_reread FROM rss_articles WHERE id='a1'").fetchone()
        self.assertEqual(row["should_reread"], 1)


if __name__ == "__main__":
    unittest.main()
