"""Model registry CRUD + role assignment + connectivity test."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db

router = APIRouter(prefix="/models", tags=["models"])


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


def _safe_text(value: object, limit: int = 200) -> str:
    try:
        text = str(value)
    except Exception:
        text = repr(value)
    return text.encode("utf-8", errors="replace").decode("utf-8")[:limit]


def _write_role_health(conn, model_id: int, ok: bool, error: str | None = None) -> None:
    now = datetime.now(timezone.utc).isoformat()
    rows = conn.execute("SELECT role FROM model_roles WHERE model_id = ?", (model_id,)).fetchall()
    for row in rows:
        module = f"{row['role']}_model"
        conn.execute(
            "INSERT INTO health (module, status, last_ok, last_error, updated_at) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(module) DO UPDATE SET "
            "status=excluded.status, "
            "last_ok=CASE WHEN excluded.status='ok' THEN excluded.last_ok ELSE health.last_ok END, "
            "last_error=excluded.last_error, updated_at=excluded.updated_at",
            (module, "ok" if ok else "failed", now if ok else None, None if ok else _safe_text(error), now),
        )


@router.get("")
def list_models():
    conn = _conn()
    models = conn.execute(
        "SELECT id, label, base_url, model, web_search, "
        "CASE WHEN api_key IS NOT NULL AND LENGTH(api_key) > 0 THEN 1 ELSE 0 END AS has_api_key "
        "FROM models"
    ).fetchall()
    roles = conn.execute("SELECT role, model_id FROM model_roles").fetchall()
    conn.close()
    return {
        "models": [{**dict(m), "has_api_key": bool(m["has_api_key"])} for m in models],
        "roles": {r["role"]: r["model_id"] for r in roles},
    }


class ModelCreate(BaseModel):
    label: str
    base_url: str = ""
    api_key: str = ""
    model: str = ""


@router.post("")
def create_model(body: ModelCreate):
    conn = _conn()
    cur = conn.execute(
        "INSERT INTO models (label, base_url, api_key, model) VALUES (?, ?, ?, ?)",
        (body.label, body.base_url, body.api_key, body.model),
    )
    conn.commit()
    model_id = cur.lastrowid
    conn.close()
    return {"id": model_id}


class ModelUpdate(BaseModel):
    id: int
    label: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    model: str | None = None
    web_search: int | None = None


@router.put("")
def update_models(updates: list[ModelUpdate]):
    conn = _conn()
    for u in updates:
        fields, values = [], []
        if u.label is not None:
            fields.append("label = ?"); values.append(u.label)
        if u.base_url is not None:
            fields.append("base_url = ?"); values.append(u.base_url)
        if u.api_key is not None:
            fields.append("api_key = ?"); values.append(u.api_key)
        if u.model is not None:
            fields.append("model = ?"); values.append(u.model)
        if u.web_search is not None:
            fields.append("web_search = ?"); values.append(u.web_search)
        if fields:
            values.append(u.id)
            conn.execute(f"UPDATE models SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/{model_id}")
def delete_model(model_id: int):
    conn = _conn()
    conn.execute("DELETE FROM model_roles WHERE model_id = ?", (model_id,))
    conn.execute("DELETE FROM models WHERE id = ?", (model_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


class RoleAssign(BaseModel):
    role: str  # "base" or "pro"
    model_id: int


@router.put("/roles")
def assign_role(body: RoleAssign):
    conn = _conn()
    conn.execute(
        "INSERT INTO model_roles (role, model_id) VALUES (?, ?) "
        "ON CONFLICT(role) DO UPDATE SET model_id=excluded.model_id",
        (body.role, body.model_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.post("/{model_id}/test")
def test_model(model_id: int):
    conn = _conn()
    row = conn.execute("SELECT * FROM models WHERE id = ?", (model_id,)).fetchone()
    if not row:
        conn.close()
        return {"ok": False, "error": "Model not found"}
    try:
        from openai import OpenAI
        client = OpenAI(base_url=row["base_url"], api_key=row["api_key"])
        resp = client.chat.completions.create(
            model=row["model"],
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        content = resp.choices[0].message.content or ""
        _write_role_health(conn, model_id, True)
        conn.commit()
        conn.close()
        return {"ok": True, "response": _safe_text(content, 50)}
    except Exception as e:
        error = _safe_text(e)
        _write_role_health(conn, model_id, False, error)
        conn.commit()
        conn.close()
        return {"ok": False, "error": error}
