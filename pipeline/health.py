"""Pipeline progress tracking and health status writing."""

import threading

from helpers import now_iso, safe_text

# ── Pipeline progress tracking ──

_pipeline_progress = {
    "running": False,
    "step": "idle",
    "members_done": 0,
    "members_total": 0,
    "rss_sources_done": 0,
    "rss_sources_total": 0,
    "events_found": 0,
    "search_done": 0,
    "search_total": 0,
    "started_at": "",
    "members": [],  # [{name, domain, status, events, log}]
}
_progress_lock = threading.Lock()


def get_progress() -> dict:
    with _progress_lock:
        p = dict(_pipeline_progress)
        p["members"] = [dict(m) for m in p["members"]]
        return p


def _update_progress(**kwargs):
    with _progress_lock:
        _pipeline_progress.update(kwargs)


def _update_member_status(idx: int, status: str, events: int = 0, log: str = ""):
    with _progress_lock:
        members = _pipeline_progress["members"]
        if idx < len(members):
            members[idx]["status"] = status
            if events:
                members[idx]["events"] = events
            if log:
                members[idx]["log"] = log


# ── Health writer ──

def write_health(conn, module: str, status: str, error: str | None = None):
    now = now_iso()
    safe_error = safe_text(error) if error else None
    if status == "ok":
        conn.execute(
            "INSERT INTO health (module, status, last_ok, last_error, updated_at, consecutive_failures) "
            "VALUES (?, ?, ?, ?, ?, 0) "
            "ON CONFLICT(module) DO UPDATE SET "
            "status=excluded.status, last_ok=excluded.last_ok, "
            "last_error=excluded.last_error, updated_at=excluded.updated_at, consecutive_failures=0",
            (module, status, now, safe_error, now),
        )
    else:
        conn.execute(
            "INSERT INTO health (module, status, last_ok, last_error, updated_at, consecutive_failures) "
            "VALUES (?, ?, NULL, ?, ?, 1) "
            "ON CONFLICT(module) DO UPDATE SET "
            "status=excluded.status, last_error=excluded.last_error, "
            "updated_at=excluded.updated_at, consecutive_failures=health.consecutive_failures + 1",
            (module, status, safe_error, now),
        )
    conn.commit()


def write_notification(conn, ntype: str, title: str, detail: str | None = None):
    conn.execute(
        "INSERT INTO notifications (type, title, detail, created_at) VALUES (?, ?, ?, ?)",
        (ntype, title, detail, now_iso()),
    )
    conn.commit()
