"""RSS sources CRUD."""

import os
import sys
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db

router = APIRouter(prefix="/sources", tags=["sources"])


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
