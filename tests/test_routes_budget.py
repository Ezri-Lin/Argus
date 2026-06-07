"""Tests for budget status and last run endpoints."""

import os
import tempfile
import unittest

from pipeline.db import init_db
from api.routes_budget import get_budget_status, get_last_run


class TestRoutesBudget(unittest.TestCase):
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

    def test_budget_status_returns_dict(self):
        result = get_budget_status(self.conn)
        self.assertIn("daily_ai_calls", result)
        self.assertIn("used", result["daily_ai_calls"])
        self.assertIn("limit", result["daily_ai_calls"])

    def test_budget_status_reflects_custom_limits(self):
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES ('budget.daily_ai_calls', '10')"
        )
        self.conn.commit()
        result = get_budget_status(self.conn)
        self.assertEqual(result["daily_ai_calls"]["limit"], 10.0)

    def test_budget_status_reflects_usage(self):
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES ('budget_used.daily_ai_calls', '25')"
        )
        self.conn.commit()
        result = get_budget_status(self.conn)
        self.assertEqual(result["daily_ai_calls"]["used"], 25.0)
        self.assertEqual(result["daily_ai_calls"]["remaining"], 25.0)  # default 50 - 25

    def test_last_run_returns_none_when_no_runs(self):
        result = get_last_run(self.conn)
        self.assertIsNone(result)

    def test_last_run_returns_dict_when_health_exists(self):
        self.conn.execute(
            "INSERT INTO health (module, status, last_ok, last_error, updated_at) "
            "VALUES ('pipeline', 'ok', '2025-01-01T00:00:00', NULL, '2025-01-01T00:00:00')"
        )
        self.conn.commit()
        result = get_last_run(self.conn)
        self.assertIsNotNone(result)
        self.assertEqual(result["module"], "pipeline")
        self.assertEqual(result["status"], "ok")


if __name__ == "__main__":
    unittest.main()
