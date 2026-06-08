"""Pipeline trigger, progress, and last-run endpoints."""

import os

from fastapi import APIRouter
from pydantic import BaseModel

from pipeline.db import get_db

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


def get_last_run(conn) -> dict | None:
    """Return the most recent pipeline health record, or None."""
    row = conn.execute(
        "SELECT * FROM health WHERE module = 'pipeline' ORDER BY updated_at DESC LIMIT 1"
    ).fetchone()
    if not row:
        return None
    return dict(row)


@router.post("/trigger")
def trigger_pipeline():
    """Manually trigger a pipeline run (non-blocking, runs in background)."""
    from .scheduler import trigger_now
    try:
        trigger_now()
        return {"ok": True, "message": "Pipeline triggered"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/progress")
def get_pipeline_progress():
    """Return current pipeline progress (for frontend polling)."""
    from pipeline.health import get_progress
    return get_progress()


@router.get("/last-run")
def last_run():
    """Get the last pipeline run status."""
    conn = _conn()
    try:
        result = get_last_run(conn)
        return result or {"status": "no_runs"}
    finally:
        conn.close()


class DomainTrigger(BaseModel):
    domain: str


@router.post("/trigger-domain")
def trigger_domain(body: DomainTrigger):
    """Reset scan schedule for a domain's members and trigger pipeline."""
    conn = _conn()
    conn.execute(
        "UPDATE memberships SET next_scan_at = NULL WHERE domain = ? AND enabled = 1",
        (body.domain,),
    )
    conn.commit()
    conn.close()
    from .scheduler import trigger_now
    trigger_now()
    return {"ok": True, "message": f"Domain '{body.domain}' queued for scan"}
