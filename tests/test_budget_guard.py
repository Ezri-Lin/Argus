import tempfile
import unittest

from pipeline.db import init_db, get_db, set_setting
from pipeline.budget_guard import BudgetGuard, DEFAULT_BUDGETS


class TestBudgetGuard(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db")
        init_db(self.tmp.name)
        self.conn = get_db(self.tmp.name)

    def tearDown(self):
        self.conn.close()
        self.tmp.close()

    def test_defaults_when_no_settings(self):
        bg = BudgetGuard(self.conn)
        self.assertEqual(bg.get("daily_ai_calls"), 50)
        self.assertEqual(bg.get("daily_llm_tokens"), 100000)
        self.assertEqual(bg.get("daily_tavily_budget_usd"), 0.50)

    def test_settings_override(self):
        set_setting(self.conn, "budget.daily_ai_calls", "100")
        bg = BudgetGuard(self.conn)
        self.assertEqual(bg.get("daily_ai_calls"), 100)

    def test_allow_when_under_budget(self):
        bg = BudgetGuard(self.conn)
        self.assertTrue(bg.allow("daily_ai_calls", used=10))

    def test_deny_when_over_budget(self):
        bg = BudgetGuard(self.conn)
        self.assertFalse(bg.allow("daily_ai_calls", used=60))

    def test_allow_paid_fallback(self):
        bg = BudgetGuard(self.conn)
        self.assertTrue(bg.allow_paid_fallback("tavily", spent_usd=0.10))
        self.assertFalse(bg.allow_paid_fallback("tavily", spent_usd=0.60))

    def test_status_dict(self):
        bg = BudgetGuard(self.conn)
        status = bg.status(used={"daily_ai_calls": 12, "daily_llm_tokens": 23000})
        self.assertEqual(status["daily_ai_calls"]["used"], 12)
        self.assertEqual(status["daily_ai_calls"]["limit"], 50)


if __name__ == "__main__":
    unittest.main()
