"""Pipeline trigger and progress endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


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
    from pipeline import get_progress
    return get_progress()
