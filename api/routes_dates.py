"""AI date suggestion endpoints."""

import json
import sys
from datetime import date
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_model_for_role, get_setting

from .ai_helpers import _call_model, _conn, _safe_text, _search_query

router = APIRouter(prefix="/ai", tags=["ai"])


def _query_dates_for_keyword(model_cfg: dict, keyword: str, language: str = "zh") -> list[dict]:
    """Query AI for future date nodes for a single keyword. Uses web search for grounding."""
    today = date.today().isoformat()

    evidence_block = ""
    try:
        conn = _conn()
        search_query = f"{keyword} schedule dates 2026"
        results = _search_query(conn, search_query, max_results=5)
        conn.close()
        if results:
            evidence_block = "\n".join(
                f"- {r['title']}: {r['snippet']}" for r in results
            )
    except Exception:
        pass

    if language == "en":
        system = f"""You are a date estimation assistant. Today is {today}.

【Rules】
- Only list dates after {today}, never give past dates
- Dates must be in YYYY-MM-DD format
- Use the web search evidence below to find ACCURATE dates. Do NOT guess.
- If no evidence is available for a date, mark confidence=likely
- List 3-8 key date milestones

Output strict JSON:
{{"dates":[{{"date":"YYYY-MM-DD","label":"Event description","confidence":"confirmed|likely"}}]}}"""
        user_msg = f"Subject I'm tracking: {keyword}\n"
        if evidence_block:
            user_msg += f"\nWeb search results (use these for accurate dates):\n{evidence_block}\n"
        user_msg += f"\nList all key date milestones from {today} onward."
    else:
        system = f"""你是日期推算助手。今天是 {today}。

【规则】
- 只列出 {today} 之后的日期，绝对不能给出过去的日期
- 日期必须是 YYYY-MM-DD 格式
- 必须基于下方搜索结果给出准确日期，不要猜测
- 如果搜索结果中没有相关信息，标记 confidence=likely
- 尽量列出 3-8 个关键日期节点

严格输出 JSON：
{{"dates":[{{"date":"YYYY-MM-DD","label":"事件描述","confidence":"confirmed|likely"}}]}}"""
        user_msg = f"我关注的对象：{keyword}\n"
        if evidence_block:
            user_msg += f"\n网络搜索结果（请基于这些信息给出准确日期）：\n{evidence_block}\n"
        user_msg += f"\n请列出从 {today} 起未来所有关键日期节点。"

    raw = _call_model(model_cfg, system, user_msg)
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    result = json.loads(raw)
    dates = result.get("dates", [])
    dates = [d for d in dates if d.get("date", "") >= today]
    dates.sort(key=lambda d: d.get("date", ""))
    return dates


# ── Suggest Dates ──

class SuggestDatesRequest(BaseModel):
    keyword: str


@router.post("/suggest-dates")
def suggest_dates(body: SuggestDatesRequest):
    conn = _conn()
    model = get_model_for_role(conn, "base")
    language = get_setting(conn, "language", "zh")
    conn.close()

    if not model:
        return {"ok": False, "error": "No base model configured"}

    try:
        dates = _query_dates_for_keyword(model, body.keyword, language)
        return {"ok": True, "dates": dates}
    except Exception as e:
        return {"ok": False, "error": f"Model error: {_safe_text(e)}"}


# ── Batch Refresh Dates (for countdown auto-sync) ──

class RefreshDatesRequest(BaseModel):
    keywords: list[str]


@router.post("/refresh-dates")
def refresh_dates(body: RefreshDatesRequest):
    """Batch refresh dates for multiple keywords. Used by daily scheduler job."""
    conn = _conn()
    model = get_model_for_role(conn, "base")
    language = get_setting(conn, "language", "zh")
    conn.close()

    if not model:
        return {"ok": False, "error": "No base model configured"}

    results: dict[str, list[dict]] = {}
    for kw in body.keywords:
        kw = kw.strip()
        if not kw:
            continue
        try:
            dates = _query_dates_for_keyword(model, kw, language)
            results[kw] = dates
        except Exception as e:
            results[kw] = []
            print(f"  refresh-dates error for '{kw}': {_safe_text(e)}")

    return {"ok": True, "results": results}
