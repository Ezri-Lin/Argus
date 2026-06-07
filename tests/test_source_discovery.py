import tempfile
import unittest
from unittest.mock import patch, MagicMock

from pipeline.db import init_db, get_db
from pipeline.source_discovery import SourceDiscoveryEngine


class TestSourceDiscovery(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db")
        init_db(self.tmp.name)
        self.conn = get_db(self.tmp.name)
        self.engine = SourceDiscoveryEngine(self.conn)

    def tearDown(self):
        self.conn.close()
        self.tmp.close()

    def test_common_feed_paths(self):
        paths = self.engine._common_feed_paths()
        self.assertIn("/feed", paths)
        self.assertIn("/rss.xml", paths)
        self.assertIn("/blog/feed", paths)

    def test_score_candidate(self):
        candidate = {
            "feed_url": "https://openai.com/blog/feed.xml",
            "site_url": "https://openai.com",
            "member_name": "OpenAI",
        }
        score = self.engine._score_candidate(candidate)
        self.assertGreater(score, 0.5)

    def test_save_candidate(self):
        self.engine._save_candidate(
            member_id="m1",
            name="OpenAI Blog RSS",
            site_url="https://openai.com",
            feed_url="https://openai.com/blog/feed",
            score=0.91,
            reason="Found from official domain",
        )
        rows = self.conn.execute("SELECT * FROM source_candidates").fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["status"], "candidate")

    def test_save_high_score_auto_enables(self):
        self.engine._save_candidate(
            member_id="m1",
            name="Official RSS",
            site_url="https://openai.com",
            feed_url="https://openai.com/feed",
            score=0.90,
            reason="Official domain match",
        )
        rows = self.conn.execute("SELECT * FROM source_candidates").fetchall()
        self.assertEqual(rows[0]["status"], "auto_enabled")

    @patch("pipeline.source_discovery.requests")
    def test_discover_from_url_finds_rss_link(self, mock_requests):
        mock_response = MagicMock()
        mock_response.text = '''
        <html><head>
        <link rel="alternate" type="application/rss+xml" title="Blog RSS" href="/blog/feed.xml">
        </head><body></body></html>
        '''
        mock_response.status_code = 200
        mock_requests.get.return_value = mock_response

        candidates = self.engine.discover_from_url("https://example.com", "m1")
        self.assertTrue(len(candidates) > 0)
        self.assertIn("/blog/feed.xml", candidates[0]["feed_url"])


if __name__ == "__main__":
    unittest.main()
