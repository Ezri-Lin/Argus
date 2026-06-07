"""Shared helpers for AI route modules."""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db, get_model_for_role, get_setting


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


def _safe_text(value: object, limit: int = 200) -> str:
    try:
        text = str(value)
    except Exception:
        text = repr(value)
    return text.encode("utf-8", errors="replace").decode("utf-8")[:limit]


def _call_model(model_cfg: dict, system: str, user: str) -> str:
    from openai import OpenAI
    client = OpenAI(base_url=model_cfg["base_url"], api_key=model_cfg["api_key"])
    resp = client.chat.completions.create(
        model=model_cfg["model"],
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.3,
    )
    return resp.choices[0].message.content.strip()


def _search_query(conn, query: str, max_results: int = 5) -> list[dict]:
    """Search using SearchRouter. Returns list of {title, url, snippet}."""
    from search.router import SearchRouter

    search_router = SearchRouter(conn, profile="api")
    response = search_router.search(query, max_results=max_results, trigger_reason="api")
    return [r.to_dict() for r in response.results]
