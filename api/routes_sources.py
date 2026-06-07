"""RSS sources CRUD + sources-library management."""

import json
import os
import sys
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db

router = APIRouter(prefix="/sources", tags=["sources"])
library_router = APIRouter(prefix="/sources-library", tags=["sources-library"])


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


@router.get("")
def list_sources():
    conn = _conn()
    rows = conn.execute("SELECT id, name, type, url, weight FROM sources ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


class SourceCreate(BaseModel):
    name: str
    url: str
    weight: float = 1.0


@router.post("")
def create_source(body: SourceCreate):
    conn = _conn()
    cur = conn.execute(
        "INSERT INTO sources (name, type, url, weight) VALUES (?, 'rss', ?, ?)",
        (body.name, body.url, body.weight),
    )
    conn.commit()
    source_id = cur.lastrowid
    conn.close()
    return {"id": source_id}


class SourceUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    weight: float | None = None


@router.put("/{source_id}")
def update_source(source_id: int, body: SourceUpdate):
    conn = _conn()
    fields, values = [], []
    if body.name is not None:
        fields.append("name = ?"); values.append(body.name)
    if body.url is not None:
        fields.append("url = ?"); values.append(body.url)
    if body.weight is not None:
        fields.append("weight = ?"); values.append(body.weight)
    if fields:
        values.append(source_id)
        conn.execute(f"UPDATE sources SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/{source_id}")
def delete_source(source_id: int):
    conn = _conn()
    conn.execute("DELETE FROM sources WHERE id = ?", (source_id,))
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


@library_router.get("")
def get_sources_library():
    return _read_library()


class LibraryDoc(BaseModel):
    streams: list = []
    feeds: list = []


@library_router.put("")
def put_sources_library(body: LibraryDoc):
    _write_library(body.model_dump())
    return {"ok": True}


@library_router.post("/import")
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
