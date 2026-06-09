"""Argus FastAPI server — core endpoints + route module registration."""

import json
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

_project_root = str(Path(__file__).parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)
from pipeline.db import get_db, get_setting, set_setting

load_dotenv(Path(__file__).parent.parent / ".env")


@asynccontextmanager
async def lifespan(app):
    from .scheduler import start_scheduler, shutdown_scheduler
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(title="Argus API", lifespan=lifespan)

_cors_origins = os.environ.get(
    "ARGUS_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
from .routes_models import router as models_router
from .routes_members import router as members_router
from .routes_sources import router as sources_router
from .routes_sources import library_router
from .routes_ai import router as ai_router
from .routes_dates import router as dates_router
from .routes_video import router as video_router
from .routes_search import router as search_router
from .routes_pipeline import router as pipeline_router
from .routes_budget import router as budget_router
from .routes_widgets import router as widgets_router
from .routes_subtitles import router as subtitles_router

app.include_router(models_router)
app.include_router(members_router)
app.include_router(sources_router)
app.include_router(library_router)
app.include_router(ai_router)
app.include_router(dates_router)
app.include_router(video_router)
app.include_router(search_router)
app.include_router(pipeline_router)
app.include_router(budget_router)
app.include_router(widgets_router)
app.include_router(subtitles_router)


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


# ── GET /data ──

@app.get("/data")
def get_data():
    conn = _conn()

    row = conn.execute("SELECT doc, generated FROM snapshot WHERE id = 'latest'").fetchone()
    treemap = json.loads(row["doc"]) if row else {"name": "watchlist", "generated": "", "children": []}

    events = conn.execute("""
        SELECT e.id, e.title, e.url, e.published, e.importance, e.sentiment,
               e.note, e.kind, e.status, e.first_seen, e.last_seen, e.outlet,
               m.name as member_name,
               s.logo_url as outlet_logo
        FROM events e
        JOIN members m ON m.id = e.member_id
        LEFT JOIN sources s ON s.name = e.outlet
        ORDER BY e.importance DESC
        LIMIT 50
    """).fetchall()

    feed = []
    for e in events:
        feed.append({
            "id": e["id"],
            "title": e["title"],
            "url": e["url"],
            "time": e["published"] or "",
            "source": e["member_name"],
            "outlet": e["outlet"] or e["member_name"],
            "sentiment": e["sentiment"] or 0,
            "importance": e["importance"] or 0,
            "summary": e["note"] or e["title"],
            "kind": e["kind"],
            "status": e["status"],
            "first_seen": e["first_seen"] or "",
            "last_seen": e["last_seen"] or "",
            "logoUrl": e["outlet_logo"] or "",
        })

    signals = []
    for e in events[:8]:
        if (e["importance"] or 0) >= 0.4:
            signals.append({
                "headline": e["title"],
                "summary": e["note"] or "",
                "sentiment": e["sentiment"] or 0,
                "time": e["published"] or "",
                "category": e["kind"] or "secondary",
                "body": e["note"] or "",
                "url": e["url"] or "",
                "importance": e["importance"] or 0,
                "kind": e["kind"],
                "status": e["status"],
                "source": e["member_name"],
                "outlet": e["outlet"] or e["member_name"],
                "logoUrl": e["outlet_logo"] or "",
            })

    conn.close()
    return JSONResponse(
        {"treemap": treemap, "feed": feed, "signals": signals},
        headers={"Cache-Control": "no-store"},
    )


# ── GET/PUT /layout ──

class LayoutDoc(BaseModel):
    widgets: list = []
    layout: dict = {}


@app.get("/layout")
def get_layout():
    conn = _conn()
    row = conn.execute("SELECT doc FROM dashboard WHERE id = 'default'").fetchone()
    conn.close()
    return json.loads(row["doc"]) if row else {"widgets": [], "layout": {}}


@app.put("/layout")
def put_layout(body: LayoutDoc):
    conn = _conn()
    now = datetime.now(timezone.utc).isoformat()
    doc = json.dumps(body.model_dump(), ensure_ascii=False)
    conn.execute(
        "INSERT INTO dashboard (id, doc, updated_at) VALUES ('default', ?, ?) "
        "ON CONFLICT(id) DO UPDATE SET doc=excluded.doc, updated_at=excluded.updated_at",
        (doc, now),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ── GET /health ──

# Freshness thresholds
_FAIL_DEGRADED = 2    # consecutive failures → degraded
_FAIL_FAILED = 5      # consecutive failures → failed (crack)
_TIME_DEGRADED_H = 24 # hours since last_ok → degraded (fallback)
_TIME_FAILED_H = 48   # hours since last_ok → failed (fallback)


@app.get("/health")
def get_health():
    conn = _conn()

    modules = conn.execute("SELECT * FROM health").fetchall()
    snapshot = conn.execute("SELECT generated FROM snapshot WHERE id = 'latest'").fetchone()
    event_count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    member_count = conn.execute("SELECT COUNT(*) FROM members").fetchone()[0]
    source_count = conn.execute("SELECT COUNT(*) FROM sources").fetchone()[0]

    now = datetime.now(timezone.utc)
    module_statuses = {}
    pipeline_consecutive = 0
    pipeline_status = "ok"

    for m in modules:
        age_hours = 0.0
        if m["last_ok"]:
            try:
                dt = datetime.fromisoformat(m["last_ok"])
                age_hours = (now - dt).total_seconds() / 3600
            except Exception:
                pass

        consecutive = m["consecutive_failures"] if m["consecutive_failures"] is not None else 0
        status = m["status"]

        # Failure-count based: primary signal
        if consecutive >= _FAIL_FAILED:
            status = "failed"
        elif consecutive >= _FAIL_DEGRADED:
            status = "degraded"
        # Time-based fallback: if service was idle too long
        elif status == "ok" and age_hours >= _TIME_FAILED_H:
            status = "failed"
        elif status == "ok" and age_hours >= _TIME_DEGRADED_H:
            status = "degraded"

        if m["module"] == "pipeline":
            pipeline_consecutive = consecutive
            pipeline_status = status

        module_statuses[m["module"]] = {
            "status": status,
            "last_ok": m["last_ok"],
            "last_error": m["last_error"],
            "age_hours": round(age_hours, 1),
            "consecutive_failures": consecutive,
        }

    # Global status: pipeline module drives it
    global_status = pipeline_status

    conn.close()
    return {
        "status": global_status,
        "modules": module_statuses,
        "event_count": event_count,
        "member_count": member_count,
        "source_count": source_count,
        "snapshot_generated": snapshot["generated"] if snapshot else None,
    }


# ── GET/PUT /settings ──

@app.get("/settings")
def get_settings():
    conn = _conn()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}


class SettingsUpdate(BaseModel):
    settings: dict[str, str]


@app.put("/settings")
def put_settings(body: SettingsUpdate):
    conn = _conn()
    for key, value in body.settings.items():
        set_setting(conn, key, value)
    conn.close()
    if "refresh_min" in body.settings:
        from .scheduler import reschedule
        try:
            reschedule(int(body.settings["refresh_min"]))
        except Exception:
            pass
    return {"ok": True}


# ── Notifications ──

@app.get("/notifications")
def get_notifications(unread_only: bool = False, limit: int = 50):
    conn = _conn()
    where = "WHERE read = 0" if unread_only else ""
    rows = conn.execute(
        f"SELECT * FROM notifications {where} ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    unread = conn.execute("SELECT COUNT(*) FROM notifications WHERE read = 0").fetchone()[0]
    conn.close()
    return {
        "items": [dict(r) for r in rows],
        "unread": unread,
    }


class NotificationRead(BaseModel):
    ids: list[int] | None = None  # None = mark all read


@app.post("/notifications/read")
def mark_notifications_read(body: NotificationRead):
    conn = _conn()
    if body.ids:
        placeholders = ",".join("?" * len(body.ids))
        conn.execute(f"UPDATE notifications SET read = 1 WHERE id IN ({placeholders})", body.ids)
    else:
        conn.execute("UPDATE notifications SET read = 1 WHERE read = 0")
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Static file serving (production / Docker) ──

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_web_dist = Path(__file__).parent.parent / "web" / "dist"
if _web_dist.is_dir():
    _assets_dir = _web_dist / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="static-assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(str(_web_dist / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa_fallback(full_path: str):
        file_path = _web_dist / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(_web_dist / "index.html"))
