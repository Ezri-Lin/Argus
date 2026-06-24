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


# ── News Report ──


class NewsReportRequest(BaseModel):
    topic: str
    max_web_results: int = 8
    max_local_articles: int = 5
    include_local: bool = True


@router.post("/news-report")
def news_report(body: NewsReportRequest):
    topic = body.topic.strip()
    if not topic:
        return {"ok": False, "error": "topic is required"}

    conn = _conn()
    model = get_model_for_role(conn, "base")
    if not model:
        conn.close()
        return {"ok": False, "error": "No base model configured"}

    # 1. Web search
    try:
        web_results = _search_query(conn, topic, max_results=body.max_web_results)
    except Exception:
        web_results = []

    # 2. Local RSS articles
    local_results: list[dict] = []
    if body.include_local:
        try:
            from local_search import LocalArticleSearch
            searcher = LocalArticleSearch(conn)
            rows = searcher.search(topic, max_candidates=body.max_local_articles)
            local_results = [
                {"title": r.get("title", ""), "url": r.get("url", ""),
                 "snippet": (r.get("snippet") or "")[:300], "source_type": "local"}
                for r in rows
            ]
        except Exception:
            pass

    # 3. Tag web results
    for r in web_results:
        r["source_type"] = "web"

    # 4. Dedupe by URL
    seen: set[str] = set()
    articles: list[dict] = []
    for r in web_results + local_results:
        url = (r.get("url") or "").strip()
        if url and url not in seen:
            seen.add(url)
            articles.append(r)

    if not articles:
        conn.close()
        return {"ok": False, "error": "No results found"}

    # 5. Build evidence + AI summary
    evidence = "\n".join(
        f"- [{a.get('source_type', '?')}] {a['title']} ({a['url']}): {a.get('snippet', '')}"
        for a in articles
    )

    language = get_setting(conn, "language", "zh")
    conn.close()

    if language == "en":
        system = """You are the Argus intelligence news report module. Generate a structured news report from the provided search results and articles.

【Task】
1. Write a 3-5 sentence English summary covering the most important findings and trends
2. List up to 8 key facts, each as a brief one-sentence statement

Output strict JSON:
{"summary":"...","key_facts":["...","..."]}"""
        user_msg = f"Topic: {topic}\n\nSearch results:\n{evidence}"
    else:
        system = """你是 Argus 情报系统的新闻报告模块。根据提供的搜索结果和文章，生成一份结构化的新闻报告。

【任务】
1. 写一段 3-5 句话的中文摘要，涵盖最重要的发现和趋势
2. 列出最多 8 条关键事实，每条为简短的一句话陈述

严格输出 JSON：
{"summary":"...","key_facts":["...","..."]}"""
        user_msg = f"主题：{topic}\n\n搜索结果：\n{evidence}"

    try:
        raw = _call_model(model, system, user_msg)
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        result = json.loads(raw)
        return {
            "ok": True,
            "topic": topic,
            "summary": result.get("summary", ""),
            "key_facts": result.get("key_facts", []),
            "articles": [
                {"title": a["title"], "url": a["url"],
                 "snippet": a.get("snippet", ""), "source_type": a["source_type"]}
                for a in articles
            ],
            "sources_used": {
                "web": len([a for a in articles if a["source_type"] == "web"]),
                "local": len([a for a in articles if a["source_type"] == "local"]),
            },
        }
    except Exception as e:
        return {"ok": False, "error": f"Model error: {_safe_text(e)}"}
