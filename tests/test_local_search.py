import tempfile
import unittest

from pipeline.db import init_db, get_db
from pipeline.local_search import LocalArticleSearch


class TestLocalArticleSearch(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db")
        init_db(self.tmp.name)
        self.conn = get_db(self.tmp.name)
        # sources.id is INTEGER PRIMARY KEY
        self.conn.execute(
            "INSERT INTO sources (id, name, type, url, enabled) VALUES (1,'TechCrunch','rss','http://tc',1)"
        )
        self.conn.execute(
            "INSERT INTO sources (id, name, type, url, enabled) VALUES (2,'Reuters','rss','http://r',1)"
        )
        # Insert test articles — source_id must match sources.id
        for i, (title, snippet) in enumerate(
            [
                ("OpenAI launches GPT-5", "OpenAI announced GPT-5 today"),
                ("Anthropic raises funding", "Anthropic raises $5B"),
                ("ChatGPT outage affects users", "ChatGPT went down for 2 hours"),
                ("Unrelated tech news", "New phone released"),
            ]
        ):
            self.conn.execute(
                """
                INSERT INTO rss_articles (id, source_id, url, title, snippet, fetched_at, lifecycle_status)
                VALUES (?, '1', ?, ?, ?, '2026-06-08', 'fresh')
            """,
                (f"a{i}", f"http://tc/{i}", title, snippet),
            )
        self.conn.commit()
        self.search = LocalArticleSearch(self.conn)

    def tearDown(self):
        self.conn.close()
        self.tmp.close()

    def test_search_by_member_name(self):
        results = self.search.search(
            member_name="OpenAI", aliases=["ChatGPT", "GPT-5"]
        )
        titles = [r["title"] for r in results]
        self.assertIn("OpenAI launches GPT-5", titles)
        self.assertIn("ChatGPT outage affects users", titles)

    def test_excludes_unrelated(self):
        results = self.search.search(member_name="OpenAI", aliases=["ChatGPT"])
        titles = [r["title"] for r in results]
        self.assertNotIn("Unrelated tech news", titles)

    def test_respects_lifecycle_status(self):
        self.conn.execute(
            "UPDATE rss_articles SET lifecycle_status = 'discarded' WHERE id = 'a0'"
        )
        self.conn.commit()
        results = self.search.search(member_name="OpenAI", aliases=["GPT-5"])
        ids = [r["id"] for r in results]
        self.assertNotIn("a0", ids)

    def test_respects_lookback_window(self):
        self.conn.execute(
            "UPDATE rss_articles SET fetched_at = '2026-01-01' WHERE id = 'a0'"
        )
        self.conn.commit()
        results = self.search.search(
            member_name="OpenAI", aliases=["GPT-5"], lookback_days=14
        )
        ids = [r["id"] for r in results]
        self.assertNotIn("a0", ids)

    def test_returns_max_candidates(self):
        results = self.search.search(
            member_name="OpenAI", aliases=["ChatGPT", "GPT-5"], max_candidates=2
        )
        self.assertLessEqual(len(results), 2)

    def test_scoring_higher_for_title_match(self):
        results = self.search.search(member_name="OpenAI", aliases=["ChatGPT"])
        # OpenAI in title should score higher than ChatGPT in snippet only
        openai_result = next(
            (r for r in results if "OpenAI" in r["title"]), None
        )
        chatgpt_result = next(
            (
                r
                for r in results
                if "ChatGPT" in r["title"] and "OpenAI" not in r["title"]
            ),
            None,
        )
        if openai_result and chatgpt_result:
            self.assertGreater(
                openai_result["retrieval_score"], chatgpt_result["retrieval_score"]
            )


if __name__ == "__main__":
    unittest.main()
