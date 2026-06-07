"""Budget status endpoint."""

import os

from fastapi import APIRouter

from pipeline.db import get_db, get_setting
from pipeline.budget_guard import BudgetGuard, DEFAULT_BUDGETS

router = APIRouter(tags=["budget"])


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


def get_budget_status(conn) -> dict:
    """Return budget status for all tracked resources."""
    bg = BudgetGuard(conn)
    used = {}
    for key in DEFAULT_BUDGETS:
        raw = get_setting(conn, f"budget_used.{key}")
        used[key] = float(raw) if raw else 0
    return bg.status(used)


@router.get("/budget-status")
def budget_status():
    """Get current budget usage and limits."""
    conn = _conn()
    try:
        return get_budget_status(conn)
    finally:
        conn.close()
