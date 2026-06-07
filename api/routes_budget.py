"""Budget status and last run summary endpoints."""

import os

from fastapi import APIRouter

from pipeline.db import get_db, get_setting
from pipeline.budget_guard import BudgetGuard, DEFAULT_BUDGETS

router = APIRouter(tags=["budget"])


def get_budget_status(conn) -> dict:
    """Return budget status for all tracked resources."""
    bg = BudgetGuard(conn)
    used = {}
    for key in DEFAULT_BUDGETS:
        raw = get_setting(conn, f"budget_used.{key}")
        used[key] = float(raw) if raw else 0
    return bg.status(used)


def get_last_run(conn) -> dict | None:
    """Return the most recent pipeline health record, or None."""
    row = conn.execute(
        "SELECT * FROM health WHERE module = 'pipeline' ORDER BY updated_at DESC LIMIT 1"
    ).fetchone()
    if not row:
        return None
    return dict(row)


@router.get("/budget-status")
def budget_status():
    """Get current budget usage and limits."""
    conn = get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))
    try:
        return get_budget_status(conn)
    finally:
        conn.close()


@router.get("/pipeline/last-run")
def last_run():
    """Get the last pipeline run status."""
    conn = get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))
    try:
        result = get_last_run(conn)
        return result or {"status": "no_runs"}
    finally:
        conn.close()
