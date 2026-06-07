"""Search provider management and logging endpoints."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db, get_setting

router = APIRouter(prefix="/search", tags=["search"])


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


# ── Providers ──


@router.get("/providers")
def list_providers():
    conn = _conn()
    rows = conn.execute("SELECT * FROM search_providers ORDER BY priority").fetchall()
    conn.close()
    return [dict(r) for r in rows]


class ProviderUpdate(BaseModel):
    profile: str | None = None
    enabled: int | None = None
    priority: int | None = None
    daily_cap: int | None = None
    timeout_sec: int | None = None
    config_json: str | None = None


@router.put("/providers/{name}")
def update_provider(name: str, body: ProviderUpdate):
    conn = _conn()
    fields, values = [], []
    if body.profile is not None:
        fields.append("profile = ?")
        values.append(body.profile)
    if body.enabled is not None:
        fields.append("enabled = ?")
        values.append(body.enabled)
    if body.priority is not None:
        fields.append("priority = ?")
        values.append(body.priority)
    if body.daily_cap is not None:
        fields.append("daily_cap = ?")
        values.append(body.daily_cap)
    if body.timeout_sec is not None:
        fields.append("timeout_sec = ?")
        values.append(body.timeout_sec)
    if body.config_json is not None:
        fields.append("config_json = ?")
        values.append(body.config_json)
    if fields:
        fields.append("updated_at = datetime('now')")
        values.append(name)
        conn.execute(
            f"UPDATE search_providers SET {', '.join(fields)} WHERE name = ?", values
        )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.post("/providers/{name}/test")
def test_provider(name: str):
    conn = _conn()
    # Get the provider's profile to use correct router
    row = conn.execute("SELECT profile FROM search_providers WHERE name = ?", (name,)).fetchone()
    profile = row["profile"] if row else "both"
    # If profile is "deep", use "deep" router; otherwise use "discovery"
    router_profile = "deep" if profile == "deep" else "discovery"
    from search.router import SearchRouter

    router_inst = SearchRouter(conn, profile=router_profile)
    response = router_inst.search("test query", max_results=1)
    conn.close()
    return {
        "ok": bool(response.results),
        "provider": name,
        "results_count": len(response.results),
        "latency_ms": response.latency_ms,
        "error": response.error,
    }


# ── Logs ──


@router.get("/search-logs")
def list_logs(limit: int = 20, provider: str = "", offset: int = 0):
    conn = _conn()
    query = "SELECT * FROM search_logs"
    params: list = []
    if provider:
        query += " WHERE provider = ?"
        params.append(provider)
    query += " ORDER BY ts DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    rows = conn.execute(query, params).fetchall()
    total = conn.execute("SELECT COUNT(*) FROM search_logs").fetchone()[0]
    conn.close()
    return {"logs": [dict(r) for r in rows], "total": total}


# ── Stats ──


@router.get("/stats")
def search_stats():
    conn = _conn()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rows = conn.execute(
        "SELECT provider, COUNT(*) as calls, SUM(results_count) as results, "
        "AVG(latency_ms) as avg_latency, SUM(cost_estimate_usd) as total_cost "
        "FROM search_logs WHERE ts >= ? GROUP BY provider",
        (today,),
    ).fetchall()
    conn.close()
    return {"today": [dict(r) for r in rows]}
