"""Members, domains, and memberships CRUD."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db, get_model_for_role, get_setting
from pipeline.snapshot import build_snapshot

router = APIRouter(tags=["members"])


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


BASELINE_PROMPT = """角色:科技/财经看板分析助手,评估「关注对象在其领域的长期基础影响力」。
输入:name={name} domain={domain} aliases={aliases}
任务:只评长期、结构性地位,不看近期新闻热度。
评分 0-100:90-100 领域定义者/头部;70-89 主要玩家;40-69 活跃有影响;20-39 新兴/小众;0-19 边缘。
要求:允许不确定;给 confidence(0-1)和一句 rationale。
输出 JSON:{{"baseline":int,"confidence":float,"rationale":string}}"""


def _clamp(value: object, low: float, high: float, default: float) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        n = default
    return max(low, min(high, n))


def _extract_json(text: str) -> dict:
    cleaned = text.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    return json.loads(cleaned)


def _domain_labels(conn, domains: list[str]) -> str:
    if not domains:
        return ""
    rows = conn.execute(
        f"SELECT key, label_zh, label_en FROM domains WHERE key IN ({','.join('?' for _ in domains)})",
        domains,
    ).fetchall()
    by_key = {
        r["key"]: " ".join(v for v in (r["label_zh"], r["label_en"]) if v)
        for r in rows
    }
    return ", ".join(by_key.get(key, key) for key in domains)


def _get_judgement_model(conn) -> tuple[str, dict | None]:
    """Prefer Pro for lasting influence judgements; fall back to Base."""
    pro_enabled = get_setting(conn, "pro_enabled", "false") == "true"
    if pro_enabled:
        pro_model = get_model_for_role(conn, "pro")
        if pro_model and pro_model.get("api_key"):
            return "pro", pro_model

    base_model = get_model_for_role(conn, "base")
    if base_model and base_model.get("api_key"):
        return "base", base_model

    return "fallback", None


def _score_baseline_influence(conn, name: str, domains: list[str], aliases: list[str]) -> dict:
    model_role, model_cfg = _get_judgement_model(conn)
    if not model_cfg:
        return {
            "baseline": 20,
            "confidence": 0.0,
            "rationale": "fallback: no judgement model configured",
            "modelRole": "fallback",
        }

    prompt = BASELINE_PROMPT.format(
        name=name,
        domain=_domain_labels(conn, domains),
        aliases=", ".join(aliases),
    )
    try:
        client = OpenAI(
            base_url=model_cfg["base_url"],
            api_key=model_cfg["api_key"],
            timeout=20,
        )
        resp = client.chat.completions.create(
            model=model_cfg["model"],
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": "只输出 JSON。"},
            ],
            temperature=0.1,
            timeout=25,
        )
        result = _extract_json(resp.choices[0].message.content or "{}")
        return {
            "baseline": round(_clamp(result.get("baseline"), 0, 100, 20)),
            "confidence": _clamp(result.get("confidence"), 0, 1, 0.0),
            "rationale": str(result.get("rationale", ""))[:300],
            "modelRole": model_role,
        }
    except Exception as e:
        return {
            "baseline": 20,
            "confidence": 0.0,
            "rationale": f"fallback {model_role}: {str(e)[:220]}",
            "modelRole": "fallback",
        }


def _write_snapshot(conn):
    now = datetime.now(timezone.utc).isoformat()
    snapshot = build_snapshot(conn)
    conn.execute(
        "INSERT INTO snapshot (id, doc, generated) VALUES ('latest', ?, ?) "
        "ON CONFLICT(id) DO UPDATE SET doc=excluded.doc, generated=excluded.generated",
        (json.dumps(snapshot, ensure_ascii=False), now),
    )


# ── Domains ──

@router.get("/domains")
def list_domains():
    conn = _conn()
    rows = conn.execute("SELECT * FROM domains ORDER BY weight DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


class DomainCreate(BaseModel):
    key: str
    label_zh: str = ""
    label_en: str = ""
    weight: float = 1.0
    description: str = ""
    search_intent: str = ""
    include_terms: list[str] = []
    exclude_terms: list[str] = []


@router.post("/domains")
def create_domain(body: DomainCreate):
    conn = _conn()
    conn.execute(
        "INSERT INTO domains (key, label_zh, label_en, weight, description, search_intent, include_terms, exclude_terms) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(key) DO UPDATE SET label_zh=excluded.label_zh, label_en=excluded.label_en, "
        "weight=excluded.weight, description=excluded.description, search_intent=excluded.search_intent, "
        "include_terms=excluded.include_terms, exclude_terms=excluded.exclude_terms",
        (body.key, body.label_zh, body.label_en, body.weight, body.description,
         body.search_intent, json.dumps(body.include_terms), json.dumps(body.exclude_terms)),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


class DomainUpdate(BaseModel):
    label_zh: str | None = None
    label_en: str | None = None
    weight: float | None = None
    description: str | None = None
    search_intent: str | None = None
    include_terms: list[str] | None = None
    exclude_terms: list[str] | None = None


@router.put("/domains/{key}")
def update_domain(key: str, body: DomainUpdate):
    conn = _conn()
    fields, values = [], []
    if body.label_zh is not None:
        fields.append("label_zh = ?"); values.append(body.label_zh)
    if body.label_en is not None:
        fields.append("label_en = ?"); values.append(body.label_en)
    if body.weight is not None:
        fields.append("weight = ?"); values.append(body.weight)
    if body.description is not None:
        fields.append("description = ?"); values.append(body.description)
    if body.search_intent is not None:
        fields.append("search_intent = ?"); values.append(body.search_intent)
    if body.include_terms is not None:
        fields.append("include_terms = ?"); values.append(json.dumps(body.include_terms))
    if body.exclude_terms is not None:
        fields.append("exclude_terms = ?"); values.append(json.dumps(body.exclude_terms))
    if fields:
        values.append(key)
        conn.execute(f"UPDATE domains SET {', '.join(fields)} WHERE key = ?", values)
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/domains/{key}")
def delete_domain(key: str):
    conn = _conn()
    conn.execute("DELETE FROM memberships WHERE domain = ?", (key,))
    conn.execute("DELETE FROM domains WHERE key = ?", (key,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Members ──

@router.get("/members")
def list_members():
    conn = _conn()
    members = conn.execute("""
        SELECT m.id, m.name, m.label_zh, m.label_en, m.aliases, m.symbol,
               GROUP_CONCAT(ms.domain) as domains
        FROM members m
        LEFT JOIN memberships ms ON ms.member_id = m.id
        GROUP BY m.id
        ORDER BY m.name
    """).fetchall()
    conn.close()
    result = []
    for m in members:
        d = dict(m)
        d["aliases"] = json.loads(d["aliases"]) if d["aliases"] else []
        d["domains"] = d["domains"].split(",") if d["domains"] else []
        result.append(d)
    return result


class MemberCreate(BaseModel):
    name: str
    label_zh: str = ""
    label_en: str = ""
    symbol: str = ""
    aliases: list[str] = []


@router.post("/members")
def create_member(body: MemberCreate):
    """Create or reuse global member metadata. No LLM, no memberships write."""
    conn = _conn()
    existing = conn.execute("SELECT id FROM members WHERE name = ?", (body.name,)).fetchone()
    if existing:
        conn.close()
        return {"id": existing["id"]}

    cur = conn.execute(
        "INSERT INTO members (name, label_zh, label_en, aliases, symbol) VALUES (?, ?, ?, ?, ?)",
        (body.name, body.label_zh, body.label_en, json.dumps(body.aliases), body.symbol),
    )
    member_id = cur.lastrowid
    conn.commit()
    conn.close()
    return {"id": member_id}


@router.post("/members/{member_id}/baseline")
def rescore_member_baseline(member_id: int):
    conn = _conn()
    row = conn.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="member not found")

    domains = [
        r["domain"]
        for r in conn.execute(
            "SELECT domain FROM memberships WHERE member_id = ? ORDER BY domain",
            (member_id,),
        ).fetchall()
    ]
    try:
        aliases = json.loads(row["aliases"]) if row["aliases"] else []
    except Exception:
        aliases = []

    baseline = _score_baseline_influence(conn, row["name"], domains, aliases)
    conn.execute(
        "UPDATE members SET baseline_influence = ?, baseline_confidence = ?, baseline_rationale = ? "
        "WHERE id = ?",
        (
            baseline["baseline"],
            baseline["confidence"],
            baseline["rationale"],
            member_id,
        ),
    )
    _write_snapshot(conn)
    conn.commit()
    conn.close()
    return {"ok": True, "id": member_id, "baseline": baseline}


class MemberUpdate(BaseModel):
    name: str | None = None
    label_zh: str | None = None
    label_en: str | None = None
    symbol: str | None = None
    aliases: list[str] | None = None
    domains: list[str] | None = None


@router.put("/members/{member_id}")
def update_member(member_id: int, body: MemberUpdate):
    conn = _conn()
    fields, values = [], []
    if body.name is not None:
        fields.append("name = ?"); values.append(body.name)
    if body.label_zh is not None:
        fields.append("label_zh = ?"); values.append(body.label_zh)
    if body.label_en is not None:
        fields.append("label_en = ?"); values.append(body.label_en)
    if body.symbol is not None:
        fields.append("symbol = ?"); values.append(body.symbol)
    if body.aliases is not None:
        fields.append("aliases = ?"); values.append(json.dumps(body.aliases))
    if fields:
        values.append(member_id)
        conn.execute(f"UPDATE members SET {', '.join(fields)} WHERE id = ?", values)
    if body.domains is not None:
        conn.execute("DELETE FROM memberships WHERE member_id = ?", (member_id,))
        for domain in body.domains:
            conn.execute(
                "INSERT INTO memberships (member_id, domain, role, role_weight) VALUES (?, ?, 'Primary', 1.0)",
                (member_id, domain),
            )
    _write_snapshot(conn)
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/members/{member_id}")
def delete_member(member_id: int):
    conn = _conn()
    conn.execute("DELETE FROM events WHERE member_id = ?", (member_id,))
    conn.execute("DELETE FROM memberships WHERE member_id = ?", (member_id,))
    conn.execute("DELETE FROM members WHERE id = ?", (member_id,))
    _write_snapshot(conn)
    conn.commit()
    conn.close()
    return {"ok": True}
