"""AI-powered search endpoint."""

import json
import sys
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_model_for_role, get_setting

from .ai_helpers import _call_model, _conn, _safe_text, _search_query

router = APIRouter(prefix="/ai", tags=["ai"])


class SearchRequest(BaseModel):
    query: str
    domain: str = ""


@router.post("/search")
def ai_search(body: SearchRequest):
    conn = _conn()
    model = get_model_for_role(conn, "base")

    if not model:
        conn.close()
        return {"ok": False, "error": "No base model configured"}

    try:
        results = _search_query(conn, body.query, max_results=8)
    except Exception as e:
        conn.close()
        return {"ok": False, "error": f"Search error: {_safe_text(e)}"}

    evidence = "\n".join(f"- {r['title']} ({r['url']}): {r['snippet']}" for r in results)

    language = get_setting(conn, "language", "zh")
    conn.close()

    if language == "en":
        system = """You are the Argus intelligence search summary module. Extract key information from search results.

【Task】
1. Write a 2-3 sentence English summary of the most important findings
2. List up to 5 key events, each with title, sentiment(-1~1), importance(0~1)

Output strict JSON:
{"summary":"...","events":[{"title":"...","sentiment":0.0,"importance":0.0}]}"""
        user_msg = f"Search keywords: {body.query}\n\nSearch results:\n{evidence}"
    else:
        system = """你是 Argus 情报系统的搜索摘要模块。根据搜索结果，提取关键信息。

【任务】
1. 写一段 2-3 句话的中文摘要，概括最重要的发现
2. 列出最多 5 条关键事件，每条包含 title、sentiment(-1~1)、importance(0~1)

严格输出 JSON：
{"summary":"...","events":[{"title":"...","sentiment":0.0,"importance":0.0}]}"""
        user_msg = f"搜索关键词：{body.query}\n\n搜索结果：\n{evidence}"

    try:
        raw = _call_model(model, system, user_msg)
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        result = json.loads(raw)
        return {"ok": True, **result, "sources": results}
    except Exception as e:
        return {"ok": False, "error": f"Model error: {_safe_text(e)}"}
