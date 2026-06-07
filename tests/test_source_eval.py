import tempfile, unittest
from pipeline.db import init_db, get_db
from pipeline.source_eval import SourceEvaluationEngine

class TestSourceEvaluation(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db")
        init_db(self.tmp.name)
        self.conn = get_db(self.tmp.name)
        # sources.id is INTEGER PRIMARY KEY
        self.conn.execute("""
            INSERT INTO sources (id, name, type, url, enabled, trust_score, health_status, consecutive_failures)
            VALUES (1,'Test','rss','http://x',1, 0.8, 'healthy', 0)
        """)
        self.conn.commit()
        self.engine = SourceEvaluationEngine(self.conn)

    def tearDown(self):
        self.conn.close()
        self.tmp.close()

    def test_update_health_on_success(self):
        self.engine.record_fetch_success(1)
        row = self.conn.execute("SELECT health_status, consecutive_failures FROM sources WHERE id=1").fetchone()
        self.assertEqual(row["health_status"], "healthy")
        self.assertEqual(row["consecutive_failures"], 0)

    def test_degrade_after_failures(self):
        for _ in range(3):
            self.engine.record_fetch_failure(1, "timeout")
        row = self.conn.execute("SELECT health_status, consecutive_failures FROM sources WHERE id=1").fetchone()
        self.assertEqual(row["health_status"], "degraded")
        self.assertEqual(row["consecutive_failures"], 3)

    def test_fail_after_more_failures(self):
        for _ in range(7):
            self.engine.record_fetch_failure(1, "timeout")
        row = self.conn.execute("SELECT health_status FROM sources WHERE id=1").fetchone()
        self.assertEqual(row["health_status"], "failing")

    def test_reset_on_success(self):
        for _ in range(3):
            self.engine.record_fetch_failure(1, "timeout")
        self.engine.record_fetch_success(1)
        row = self.conn.execute("SELECT health_status, consecutive_failures FROM sources WHERE id=1").fetchone()
        self.assertEqual(row["health_status"], "healthy")
        self.assertEqual(row["consecutive_failures"], 0)

    def test_get_health_summary(self):
        self.conn.execute("INSERT INTO sources (id, name, type, url, enabled, health_status) VALUES (2,'S2','rss','http://y',1,'degraded')")
        self.conn.commit()
        summary = self.engine.get_health_summary()
        self.assertEqual(summary.get("healthy", 0), 1)
        self.assertEqual(summary.get("degraded", 0), 1)

if __name__ == "__main__":
    unittest.main()
