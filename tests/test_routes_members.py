import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "pipeline"))

from db import init_db
from api import routes_members


class MemberCreateBaselineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(delete=False)
        self.tmp.close()
        self.old_db_path = os.environ.get("ARGUS_DB_PATH")
        os.environ["ARGUS_DB_PATH"] = self.tmp.name
        self.conn = init_db(self.tmp.name)
        self.conn.execute(
            "INSERT INTO domains (key, label, weight) VALUES ('ai', 'AI 大模型', 1.0)"
        )
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES ('pro_enabled', 'true')"
        )
        self.conn.commit()

    def tearDown(self):
        self.conn.close()
        if self.old_db_path is None:
            os.environ.pop("ARGUS_DB_PATH", None)
        else:
            os.environ["ARGUS_DB_PATH"] = self.old_db_path
        for suffix in ("", "-wal", "-shm"):
            path = self.tmp.name + suffix
            if os.path.exists(path):
                os.unlink(path)

    def test_create_member_scores_baseline_and_rebuilds_snapshot(self):
        old_scorer = getattr(routes_members, "_score_baseline_influence", None)
        routes_members._score_baseline_influence = lambda conn, body: {
            "baseline": 74,
            "confidence": 0.82,
            "rationale": "major AI coding product",
        }
        try:
            result = routes_members.create_member(
                routes_members.MemberCreate(
                    name="Copilot",
                    aliases=["Github Copilot"],
                    domains=["ai"],
                )
            )
        finally:
            if old_scorer is None:
                delattr(routes_members, "_score_baseline_influence")
            else:
                routes_members._score_baseline_influence = old_scorer

        member_id = result["id"]
        row = self.conn.execute(
            "SELECT baseline_influence, baseline_confidence, baseline_rationale FROM members WHERE id = ?",
            (member_id,),
        ).fetchone()
        self.assertEqual(row["baseline_influence"], 74)
        self.assertEqual(row["baseline_confidence"], 0.82)
        self.assertEqual(row["baseline_rationale"], "major AI coding product")

        snapshot_row = self.conn.execute("SELECT doc FROM snapshot WHERE id = 'latest'").fetchone()
        self.assertIsNotNone(snapshot_row)
        snapshot = json.loads(snapshot_row["doc"])
        child = snapshot["children"][0]["children"][0]
        self.assertEqual(child["name"], "Copilot")
        self.assertEqual(child["baselineInfluence"], 74)

    def test_baseline_scoring_prefers_pro_model_when_enabled(self):
        base_id = self.conn.execute(
            "INSERT INTO models (label, base_url, api_key, model, web_search) VALUES ('Base', 'http://base', 'base-key', 'base-model', 1)"
        ).lastrowid
        pro_id = self.conn.execute(
            "INSERT INTO models (label, base_url, api_key, model, web_search) VALUES ('Pro', 'http://pro', 'pro-key', 'pro-model', 1)"
        ).lastrowid
        self.conn.execute("INSERT INTO model_roles (role, model_id) VALUES ('base', ?)", (base_id,))
        self.conn.execute("INSERT INTO model_roles (role, model_id) VALUES ('pro', ?)", (pro_id,))
        self.conn.commit()

        role, model = routes_members._get_judgement_model(self.conn)

        self.assertEqual(role, "pro")
        self.assertEqual(model["model"], "pro-model")

    def test_rescore_member_updates_baseline_and_snapshot(self):
        member_id = self.conn.execute(
            "INSERT INTO members (name, aliases, baseline_influence) VALUES ('OpenAI', '[]', 20)"
        ).lastrowid
        self.conn.execute(
            "INSERT INTO memberships (member_id, domain, role_weight) VALUES (?, 'ai', 1.0)",
            (member_id,),
        )
        self.conn.commit()

        old_scorer = getattr(routes_members, "_score_baseline_influence", None)
        routes_members._score_baseline_influence = lambda conn, body: {
            "baseline": 96,
            "confidence": 0.91,
            "rationale": "field-defining AI lab",
            "modelRole": "pro",
        }
        try:
            result = routes_members.rescore_member_baseline(member_id)
        finally:
            if old_scorer is None:
                delattr(routes_members, "_score_baseline_influence")
            else:
                routes_members._score_baseline_influence = old_scorer

        self.assertEqual(result["baseline"]["baseline"], 96)
        row = self.conn.execute(
            "SELECT baseline_influence, baseline_confidence, baseline_rationale FROM members WHERE id = ?",
            (member_id,),
        ).fetchone()
        self.assertEqual(row["baseline_influence"], 96)
        self.assertEqual(row["baseline_confidence"], 0.91)
        self.assertEqual(row["baseline_rationale"], "field-defining AI lab")

        snapshot = json.loads(self.conn.execute("SELECT doc FROM snapshot WHERE id = 'latest'").fetchone()["doc"])
        self.assertEqual(snapshot["children"][0]["children"][0]["baselineInfluence"], 96)


if __name__ == "__main__":
    unittest.main()
