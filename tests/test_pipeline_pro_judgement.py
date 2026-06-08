import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import feedparser

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))

from db import init_db
import pipeline.pipeline as pipeline_module


class PipelineProJudgementTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(delete=False)
        self.tmp.close()
        self.conn = init_db(self.tmp.name)
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES ('pro_enabled', 'true')"
        )
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES ('tavily_enabled', 'false')"
        )
        self.conn.execute(
            "INSERT INTO domains (key, label, weight) VALUES ('ai', 'AI 大模型', 1.0)"
        )
        member_id = self.conn.execute(
            "INSERT INTO members (name, aliases, baseline_influence) VALUES ('OpenAI', '[\"ChatGPT\"]', 90)"
        ).lastrowid
        self.conn.execute(
            "INSERT INTO memberships (member_id, domain) VALUES (?, 'ai')",
            (member_id,),
        )
        self.conn.execute(
            "INSERT INTO sources (name, type, url) VALUES ('TestFeed', 'rss', 'https://example.com/rss')"
        )
        base_id = self.conn.execute(
            "INSERT INTO models (label, base_url, api_key, model, web_search) VALUES ('Base', 'http://base', 'base-key', 'base-model', 1)"
        ).lastrowid
        pro_id = self.conn.execute(
            "INSERT INTO models (label, base_url, api_key, model, web_search) VALUES ('Pro', 'http://pro', 'pro-key', 'pro-model', 1)"
        ).lastrowid
        self.conn.execute("INSERT INTO model_roles (role, model_id) VALUES ('base', ?)", (base_id,))
        self.conn.execute("INSERT INTO model_roles (role, model_id) VALUES ('pro', ?)", (pro_id,))
        self.conn.commit()

    def tearDown(self):
        self.conn.close()
        for suffix in ("", "-wal", "-shm"):
            path = self.tmp.name + suffix
            if os.path.exists(path):
                os.unlink(path)

    def test_pipeline_uses_pro_result_for_event_judgement_when_requested(self):
        old_parse = feedparser.parse
        old_call_model = pipeline_module.call_model
        calls = []

        def fake_parse(_content):
            return SimpleNamespace(entries=[
                {
                    "title": "OpenAI announces major platform release",
                    "link": "https://example.com/openai-platform",
                    "published": "2026-06-06T00:00:00+00:00",
                    "summary": "OpenAI launches a platform-level AI product.",
                }
            ])

        def fake_call_model(model_cfg, _system, _user):
            calls.append(model_cfg["model"])
            if model_cfg["model"] == "base-model":
                return {
                    "sentiment": 0.2,
                    "importance": 0.7,
                    "kind": "转载",
                    "need_search": False,
                    "need_pro": True,
                    "reason": "重大平台发布需要 Pro 判断",
                    "short_label": "平台发布",
                    "impactWeight": 35,
                    "impactPersistenceDays": 7,
                    "impactConfidence": 0.4,
                    "impactRationale": "Base 粗筛",
                }
            return {
                "sentiment": 0.9,
                "importance": 0.95,
                "kind": "官方一手",
                "status": "confirmed",
                "rumor": 0.1,
                "note": "平台级发布",
                "sources": ["https://openai.com/news/platform"],
                "impactWeight": 88,
                "impactPersistenceDays": 120,
                "impactConfidence": 0.93,
                "impactRationale": "平台级能力提升，持续影响较长",
            }

        mock_resp = MagicMock()
        mock_resp.content = b"<rss></rss>"
        mock_resp.raise_for_status = MagicMock()

        feedparser.parse = fake_parse
        pipeline_module.call_model = fake_call_model
        with patch("pipeline.rss.requests.get", return_value=mock_resp):
            try:
                pipeline_module.run_pipeline(self.tmp.name)
            finally:
                feedparser.parse = old_parse
                pipeline_module.call_model = old_call_model

        self.assertEqual(calls, ["base-model", "pro-model"])

        event = self.conn.execute("SELECT * FROM events").fetchone()
        self.assertIsNotNone(event)
        self.assertEqual(event["status"], "confirmed")
        self.assertAlmostEqual(event["sentiment"], 0.9)
        self.assertAlmostEqual(event["importance"], 0.95)
        self.assertAlmostEqual(event["impact_weight"], 88)
        self.assertAlmostEqual(event["impact_persistence_days"], 120)
        self.assertAlmostEqual(event["impact_confidence"], 0.93)
        self.assertEqual(event["impact_rationale"], "平台级能力提升，持续影响较长")
        self.assertEqual(event["note"], "平台级发布")
        self.assertAlmostEqual(event["rumor"], 0.1)
        self.assertEqual(json.loads(event["sources"]), ["https://openai.com/news/platform"])
        self.assertIn("pro:", event["route_reason"])


if __name__ == "__main__":
    unittest.main()
