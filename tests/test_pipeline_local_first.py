"""Test: pipeline integrates local-first RSS search flow.

When RSS returns empty but local rss_articles exist, the pipeline should
find relevant local candidates and send them to the AI model.
"""

import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from pipeline.db import init_db
import pipeline.pipeline as pipeline_module


class TestPipelineLocalFirst(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        self.tmp.close()
        self.conn = init_db(self.tmp.name)
        # Seed minimal data
        self.conn.execute(
            "INSERT INTO sources (id, name, type, url, enabled) "
            "VALUES (1, 'Test', 'rss', 'http://x', 1)"
        )
        self.conn.execute(
            "INSERT INTO domains (key, label_zh) VALUES ('ai', 'AI')"
        )
        self.conn.execute(
            "INSERT INTO members (id, name) VALUES (1, 'OpenAI')"
        )
        self.conn.execute(
            "INSERT INTO memberships (member_id, domain, tier, enabled) "
            "VALUES (1, 'ai', 'primary', 1)"
        )
        self.conn.execute(
            """
            INSERT INTO rss_articles
                (id, source_id, url, title, snippet, fetched_at,
                 lifecycle_status, relevance_score)
            VALUES
                ('a1', '1', 'http://x/1', 'OpenAI launches GPT-5',
                 'OpenAI announced GPT-5', '2026-06-08', 'fresh', 0.85)
            """
        )
        # Seed base model (required for pipeline to proceed past model check)
        base_id = self.conn.execute(
            "INSERT INTO models (label, base_url, api_key, model, web_search) "
            "VALUES ('Base', 'http://base', 'base-key', 'base-model', 0)"
        ).lastrowid
        self.conn.execute(
            "INSERT INTO model_roles (role, model_id) VALUES ('base', ?)",
            (base_id,),
        )
        self.conn.commit()

    def tearDown(self):
        self.conn.close()
        for suffix in ("", "-wal", "-shm"):
            path = self.tmp.name + suffix
            if os.path.exists(path):
                os.unlink(path)

    def test_pipeline_runs_without_error(self):
        """Pipeline should run without error even with local articles."""
        old_parse = pipeline_module.feedparser.parse
        old_call_model = pipeline_module.call_model
        model_calls = []

        def fake_parse(_content):
            return SimpleNamespace(entries=[], feed=SimpleNamespace())

        def fake_call_model(model_cfg, _system, _user):
            model_calls.append(model_cfg["model"])
            return {
                "sentiment": 0.5,
                "importance": 0.7,
                "kind": "转载",
                "event_type": "model_release",
                "need_search": False,
                "need_pro": False,
                "reason": "test",
                "short_label": "GPT-5发布",
                "impactWeight": 50,
                "impactPersistenceDays": 30,
                "impactConfidence": 0.6,
                "impactRationale": "test impact",
            }

        mock_resp = MagicMock()
        mock_resp.content = b""
        mock_resp.raise_for_status = MagicMock()

        pipeline_module.feedparser.parse = fake_parse
        pipeline_module.call_model = fake_call_model
        with patch("pipeline.rss.requests.get", return_value=mock_resp):
            try:
                pipeline_module.run_pipeline(self.tmp.name)
            finally:
                pipeline_module.feedparser.parse = old_parse
                pipeline_module.call_model = old_call_model

        # Verify pipeline completed (health was written)
        row = self.conn.execute(
            "SELECT * FROM health WHERE module='pipeline'"
        ).fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row["status"], "ok")

        # Verify the local article was actually sent to the AI model
        self.assertGreater(len(model_calls), 0, "AI model was never called")

        # Verify an event was created from the local article
        event = self.conn.execute("SELECT * FROM events").fetchone()
        self.assertIsNotNone(event)
        self.assertEqual(event["title"], "OpenAI launches GPT-5")


if __name__ == "__main__":
    unittest.main()
