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

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db, get_setting, set_setting

load_dotenv(Path(__file__).parent.parent / ".env")


@asynccontextmanager
async def lifespan(app):
    from .scheduler import start_scheduler, shutdown_scheduler
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(title="Argus API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
from .routes_models import router as models_router
from .routes_members import router as members_router
from .routes_sources import router as sources_router
from .routes_ai import router as ai_router

app.include_router(models_router)
app.include_router(members_router)
app.include_router(sources_router)
app.include_router(ai_router)


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
                "category": e["kind"] or "转载",
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


# ── Sources Library ──

LIBRARY_PATH = Path(__file__).parent.parent / "data" / "sources-library.json"


def _read_library() -> dict:
    if LIBRARY_PATH.exists():
        try:
            return json.loads(LIBRARY_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"streams": [], "feeds": []}


def _write_library(data: dict):
    LIBRARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    LIBRARY_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


@app.get("/sources-library")
def get_sources_library():
    return _read_library()


class LibraryDoc(BaseModel):
    streams: list = []
    feeds: list = []


@app.put("/sources-library")
def put_sources_library(body: LibraryDoc):
    _write_library(body.model_dump())
    return {"ok": True}


@app.post("/sources-library/import")
def import_sources_library(body: LibraryDoc):
    """Merge imported sources into existing library, dedup by url."""
    existing = _read_library()
    existing_urls = {s["url"] for s in existing.get("streams", []) if s.get("url")}
    existing_feed_urls = {s["url"] for s in existing.get("feeds", []) if s.get("url")}

    added_s = 0
    for s in body.streams:
        if s.get("url") and s["url"] not in existing_urls:
            existing.setdefault("streams", []).append(s)
            existing_urls.add(s["url"])
            added_s += 1

    added_f = 0
    for f in body.feeds:
        if f.get("url") and f["url"] not in existing_feed_urls:
            existing.setdefault("feeds", []).append(f)
            existing_feed_urls.add(f["url"])
            added_f += 1

    _write_library(existing)
    return {"ok": True, "added_streams": added_s, "added_feeds": added_f}


# ── GET /health ──

@app.get("/health")
def get_health():
    conn = _conn()

    modules = conn.execute("SELECT * FROM health").fetchall()
    snapshot = conn.execute("SELECT generated FROM snapshot WHERE id = 'latest'").fetchone()
    event_count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    member_count = conn.execute("SELECT COUNT(*) FROM members").fetchone()[0]
    source_count = conn.execute("SELECT COUNT(*) FROM sources").fetchone()[0]

    stale_threshold = int(get_setting(conn, "stale_threshold_min", "90"))
    fail_threshold = int(get_setting(conn, "global_fail_count", "2"))

    now = datetime.now(timezone.utc)
    module_statuses = {}
    failed_count = 0

    for m in modules:
        age_min = 0
        if m["updated_at"]:
            try:
                dt = datetime.fromisoformat(m["updated_at"])
                age_min = (now - dt).total_seconds() / 60
            except Exception:
                pass

        is_stale = age_min > stale_threshold
        status = m["status"]
        if status == "ok" and is_stale:
            status = "degraded"
        if status == "failed":
            failed_count += 1

        module_statuses[m["module"]] = {
            "status": status,
            "last_ok": m["last_ok"],
            "last_error": m["last_error"],
            "age_min": round(age_min),
        }

    if failed_count >= fail_threshold:
        global_status = "failed"
    elif any(s["status"] == "degraded" for s in module_statuses.values()):
        global_status = "degraded"
    else:
        global_status = "ok"

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


# ── POST /pipeline/trigger ──

@app.post("/pipeline/trigger")
def trigger_pipeline():
    """Manually trigger a pipeline run (non-blocking, runs in background)."""
    from .scheduler import trigger_now
    try:
        trigger_now()
        return {"ok": True, "message": "Pipeline triggered"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/pipeline/progress")
def get_pipeline_progress():
    """Return current pipeline progress (for frontend polling)."""
    from pipeline import get_progress
    return get_progress()
