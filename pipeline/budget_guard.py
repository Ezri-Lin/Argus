"""Budget Guard: configurable spending limits with settings override."""

from pipeline.db import get_setting

DEFAULT_BUDGETS = {
    "daily_ai_calls": 50,
    "daily_llm_tokens": 100_000,
    "per_call_token_limit": 4_000,
    "daily_deep_search_calls": 30,
    "daily_tavily_budget_usd": 0.50,
    "max_base_articles_per_run": 50,
    "max_base_articles_per_member": 5,
    "max_digest_generation_per_run": 100,
}


class BudgetGuard:
    def __init__(self, conn):
        self.conn = conn

    def get(self, key: str) -> float:
        raw = get_setting(self.conn, f"budget.{key}")
        if raw:
            return float(raw)
        return float(DEFAULT_BUDGETS.get(key, 0))

    def allow(self, key: str, used: float) -> bool:
        return used < self.get(key)

    def allow_paid_fallback(self, provider: str, spent_usd: float = 0.0) -> bool:
        limit = self.get(f"daily_{provider}_budget_usd")
        return spent_usd < limit

    def remaining(self, key: str, used: float) -> float:
        return max(0, self.get(key) - used)

    def status(self, used: dict) -> dict:
        result = {}
        for key, default in DEFAULT_BUDGETS.items():
            u = used.get(key, 0)
            limit = self.get(key)
            result[key] = {"used": u, "limit": limit, "remaining": max(0, limit - u)}
        return result
