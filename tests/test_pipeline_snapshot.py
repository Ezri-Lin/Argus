import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))

from db import init_db
from snapshot import build_snapshot


class SnapshotInfluenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(delete=False)
        self.tmp.close()
        self.conn = init_db(self.tmp.name)

    def tearDown(self):
        self.conn.close()
        for suffix in ("", "-wal", "-shm"):
            path = self.tmp.name + suffix
            if os.path.exists(path):
                os.unlink(path)

    def add_domain(self):
        self.conn.execute(
            "INSERT INTO domains (key, label, weight) VALUES ('ai', 'AI', 1.0)"
        )

    def add_member(self, name, baseline):
        cur = self.conn.execute(
            "INSERT INTO members (name, aliases, baseline_influence) VALUES (?, '[]', ?)",
            (name, baseline),
        )
        member_id = cur.lastrowid
        self.conn.execute(
            "INSERT INTO memberships (member_id, domain, role_weight) VALUES (?, 'ai', 1.0)",
            (member_id,),
        )
        return member_id

    def test_snapshot_keeps_member_with_no_events_at_baseline_floor(self):
        self.add_domain()
        self.add_member("QuietCo", 32)

        snapshot = build_snapshot(self.conn)

        children = snapshot["children"][0]["children"]
        self.assertEqual([child["name"] for child in children], ["QuietCo"])
        self.assertEqual(children[0]["size"], 32)
        self.assertEqual(children[0]["baselineInfluence"], 32)
        self.assertEqual(children[0]["freshness"], 0)
        self.assertEqual(children[0]["metric"], "quiet")

    def test_snapshot_uses_event_impact_persistence_for_size_and_freshness(self):
        self.add_domain()
        member_id = self.add_member("LongArc", 20)
        last_seen = datetime.now(timezone.utc) - timedelta(days=30)
        self.conn.execute(
            """
            INSERT INTO events (
              fingerprint, member_id, title, url, outlet, published,
              sentiment, importance, impact_weight, impact_persistence_days,
              kind, status, note, first_seen, last_seen
            )
            VALUES (
              'fp-long-arc', ?, 'LongArc lands structural deal', '', 'TestWire', ?,
              0.6, 0.8, 80, 120,
              '官方一手', 'confirmed', 'structural deal', ?, ?
            )
            """,
            (
                member_id,
                last_seen.isoformat(),
                last_seen.isoformat(),
                last_seen.isoformat(),
            ),
        )

        snapshot = build_snapshot(self.conn)

        child = snapshot["children"][0]["children"][0]
        self.assertGreater(child["size"], 85)
        self.assertLess(child["freshness"], 0.01)
        self.assertEqual(child["impactWeight"], 80)
        self.assertEqual(child["impactPersistenceDays"], 120)


if __name__ == "__main__":
    unittest.main()
