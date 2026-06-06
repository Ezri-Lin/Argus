"""AI-powered endpoints: search, suggest dates, parse video, stat proxy."""

import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path
from urllib.parse import parse_qs, quote, urljoin, urlparse

from fastapi import APIRouter, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db, get_model_for_role, get_setting

router = APIRouter(prefix="/ai", tags=["ai"])


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


def _call_tavily(api_key: str, query: str, max_results: int = 5) -> list[dict]:
    req = urllib.request.Request(
        "https://api.tavily.com/search",
        data=json.dumps({
            "api_key": api_key,
            "query": query,
            "max_results": max_results,
        }).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
        return [
            {"title": r["title"], "url": r["url"], "snippet": r.get("content", "")[:300]}
            for r in data.get("results", [])
        ]


# ── AI Search ──

class SearchRequest(BaseModel):
    query: str
    domain: str = ""


@router.post("/search")
def ai_search(body: SearchRequest):
    conn = _conn()
    tavily_key = get_setting(conn, "tavily_api_key", "") or os.environ.get("TAVILY_API_KEY", "")
    model = get_model_for_role(conn, "base")
    conn.close()

    if not tavily_key:
        return {"ok": False, "error": "Tavily API key not configured"}
    if not model:
        return {"ok": False, "error": "No base model configured"}

    try:
        results = _call_tavily(tavily_key, body.query, max_results=8)
    except Exception as e:
        return {"ok": False, "error": f"Tavily error: {_safe_text(e)}"}

    evidence = "\n".join(f"- {r['title']} ({r['url']}): {r['snippet']}" for r in results)

    language = get_setting(conn, "language", "zh")

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


# ── Suggest Dates ──

class SuggestDatesRequest(BaseModel):
    keyword: str


def _query_dates_for_keyword(model_cfg: dict, keyword: str, language: str = "zh", tavily_key: str = "", tavily_enabled: bool = True) -> list[dict]:
    """Query AI for future date nodes for a single keyword. Uses Tavily web search for grounding."""
    from datetime import date
    today = date.today().isoformat()

    # Tavily search for real dates (only if tavily_enabled)
    evidence_block = ""
    if tavily_key and tavily_enabled:
        try:
            search_query = f"{keyword} schedule dates 2026"
            results = _call_tavily(tavily_key, search_query, max_results=5)
            if results:
                evidence_block = "\n".join(
                    f"- {r['title']}: {r['snippet']}" for r in results
                )
        except Exception:
            pass  # Tavily failure is non-fatal

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


@router.post("/suggest-dates")
def suggest_dates(body: SuggestDatesRequest):
    conn = _conn()
    model = get_model_for_role(conn, "base")
    language = get_setting(conn, "language", "zh")
    tavily_key = get_setting(conn, "tavily_api_key", "") or os.environ.get("TAVILY_API_KEY", "")
    tavily_enabled = get_setting(conn, "tavily_enabled", "false") == "true"
    conn.close()

    if not model:
        return {"ok": False, "error": "No base model configured"}

    try:
        dates = _query_dates_for_keyword(model, body.keyword, language, tavily_key, tavily_enabled)
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
    tavily_key = get_setting(conn, "tavily_api_key", "") or os.environ.get("TAVILY_API_KEY", "")
    tavily_enabled = get_setting(conn, "tavily_enabled", "false") == "true"
    conn.close()

    if not model:
        return {"ok": False, "error": "No base model configured"}

    results: dict[str, list[dict]] = {}
    for kw in body.keywords:
        kw = kw.strip()
        if not kw:
            continue
        try:
            dates = _query_dates_for_keyword(model, kw, language, tavily_key, tavily_enabled)
            results[kw] = dates
        except Exception as e:
            results[kw] = []
            print(f"  refresh-dates error for '{kw}': {_safe_text(e)}")

    return {"ok": True, "results": results}


# ── Parse Video ──

class ParseVideoRequest(BaseModel):
    url: str


def _iframe_fallback_url(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    path = parsed.path.strip("/")

    if "youtube.com" in host:
        video_id = parse_qs(parsed.query).get("v", [""])[0]
        if video_id:
            return f"https://www.youtube.com/embed/{video_id}"
    if "youtu.be" in host and path:
        return f"https://www.youtube.com/embed/{path.split('/')[0]}"
    if "bilibili.com" in host:
        match = re.search(r"(BV[a-zA-Z0-9]+)", path)
        if match:
            return f"https://player.bilibili.com/player.html?bvid={match.group(1)}"

    return url


def _append_iframe_fallback(sources: list[dict], url: str) -> None:
    fallback = _iframe_fallback_url(url)
    if not any(s.get("url") == fallback for s in sources):
        sources.append({"url": fallback, "label": "Embed fallback", "type": "iframe"})


def _append_source(sources: list[dict], url: str, label: str, source_type: str) -> None:
    if url and not any(s.get("url") == url for s in sources):
        sources.append({"url": url, "label": label, "type": source_type})


@router.post("/parse-video")
def parse_video(body: ParseVideoRequest, request: Request):
    url = body.url.strip()
    sources = []

    # Direct stream URLs — skip yt-dlp
    if ".m3u8" in url:
        sources.append({"url": url, "label": "HLS Stream", "type": "hls"})
    elif ".mpd" in url:
        sources.append({"url": url, "label": "DASH Stream", "type": "dash"})
    elif ".mp4" in url:
        sources.append({"url": url, "label": "MP4 Video", "type": "mp4"})

    # yt-dlp: extract from platform pages (Bilibili, YouTube, Twitch, Douyu, etc.)
    used_extractor = False
    if not sources:
        try:
            ytdl_cmd = ["yt-dlp", "-j", "--no-download", url]
            result = subprocess.run(
                ytdl_cmd,
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode == 0 and result.stdout.strip():
                used_extractor = True
                info = json.loads(result.stdout)
                title = info.get("title", "Video")

                if info.get("formats"):
                    fmts = info["formats"]

                    # Pick highest quality HLS
                    hls_fmts = [f for f in fmts
                                if "m3u8" in (f.get("protocol") or "").lower()
                                or ".m3u8" in (f.get("url") or "")]
                    if hls_fmts:
                        best = max(hls_fmts, key=lambda f: f.get("height") or 0)
                        res = best.get("height", "")
                        label = f"{title} (HLS {res}p)" if res else f"{title} (HLS)"
                        _append_source(sources, best["url"], label, "hls")

                    # Pick highest quality progressive (MP4/WebM)
                    prog_fmts = [f for f in fmts
                                 if f.get("url")
                                 and ((f.get("ext") or "").lower() in ("mp4", "webm", "flv")
                                      or "https" in (f.get("protocol") or "").lower())]
                    if prog_fmts:
                        best = max(prog_fmts, key=lambda f: f.get("height") or 0)
                        res = best.get("height", "")
                        label = f"{title} ({res}p)" if res else title
                        _append_source(sources, best["url"], label, "video")

                if info.get("url"):
                    src_type = "hls" if ".m3u8" in info["url"] else "video"
                    label = f"{title} (HLS)" if src_type == "hls" else title
                    _append_source(sources, info["url"], label, src_type)
                _append_iframe_fallback(sources, url)
        except Exception:
            pass

    # Fallback: detect from response headers
    if not sources:
        try:
            req = urllib.request.Request(url, method="HEAD")
            req.add_header("User-Agent", "Mozilla/5.0")
            with urllib.request.urlopen(req, timeout=10) as resp:
                content_type = resp.headers.get("Content-Type", "")
                if "mpegurl" in content_type:
                    sources.append({"url": url, "label": "HLS Stream", "type": "hls"})
                elif "dash" in content_type:
                    sources.append({"url": url, "label": "DASH Stream", "type": "dash"})
                elif "mp4" in content_type:
                    sources.append({"url": url, "label": "MP4 Video", "type": "mp4"})
                else:
                    sources.append({"url": _iframe_fallback_url(url), "label": "Embed fallback", "type": "iframe"})
        except Exception:
            sources.append({"url": _iframe_fallback_url(url), "label": "Embed fallback", "type": "iframe"})
    elif not used_extractor and sources[0].get("type") not in ("hls", "mp4", "video"):
        _append_iframe_fallback(sources, url)

    return {"ok": True, "sources": sources}


# ── Stat API Proxy ──

class StatApiRequest(BaseModel):
    url: str
    json_path: str = ""


@router.post("/stat-api")
def stat_api(body: StatApiRequest):
    try:
        req = urllib.request.Request(body.url)
        req.add_header("User-Agent", "Argus/1.0")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        # Extract value using dot-notation path
        value = data
        if body.json_path:
            for key in body.json_path.split("."):
                if isinstance(value, dict):
                    value = value.get(key)
                elif isinstance(value, list) and key.isdigit():
                    value = value[int(key)]
                else:
                    return {"ok": False, "error": f"Path not found at '{key}'"}

        return {"ok": True, "value": value}
    except Exception as e:
        return {"ok": False, "error": _safe_text(e)}


# ── Stream Proxy (strips Origin/Referer for CDN-protected HLS) ──

@router.get("/stream-proxy")
def stream_proxy(url: str, request: Request):
    """Proxy HLS/video streams — strips browser Origin header so CDNs don't 403."""
    try:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "Mozilla/5.0")
        range_header = request.headers.get("range")
        if range_header:
            req.add_header("Range", range_header)

        resp = urllib.request.urlopen(req, timeout=15)
        try:
            content_type = resp.headers.get("Content-Type", "application/octet-stream")
            is_manifest = "mpegurl" in content_type or urlparse(url).path.lower().endswith(".m3u8")

            # For m3u8 manifests: rewrite relative segment URLs to go through proxy
            if is_manifest:
                body = resp.read()
                content_type = "application/vnd.apple.mpegurl"
                text = body.decode("utf-8", errors="replace")
                parsed = urlparse(url)
                base = f"{parsed.scheme}://{parsed.netloc}{'/'.join(parsed.path.rsplit('/', 1)[:-1])}/"

                def proxied(target: str) -> str:
                    return f"/ai/stream-proxy?url={quote(target, safe='')}"

                def rewrite_segment(m):
                    seg = m.group(1)
                    if seg.startswith("http"):
                        return proxied(seg)
                    abs_url = urljoin(base, seg)
                    return proxied(abs_url)

                text = re.sub(r'^(?!#)(.+\.ts.*)$', rewrite_segment, text, flags=re.MULTILINE)
                # Also rewrite sub-manifests (variant playlists)
                text = re.sub(r'^(?!#)(.+\.m3u8.*)$', rewrite_segment, text, flags=re.MULTILINE)
                # Rewrite .mp4 segments (Shaka-packager style)
                text = re.sub(r'^(?!#)(.+\.mp4)$', rewrite_segment, text, flags=re.MULTILINE)
                # Rewrite URI="..." attributes in HLS tags (init segments, audio manifests, etc.)
                def rewrite_uri_attr(m):
                    seg = m.group(1)
                    if seg.startswith("http"):
                        return f'URI="{proxied(seg)}"'
                    abs_url = urljoin(base, seg)
                    return f'URI="{proxied(abs_url)}"'
                text = re.sub(r'URI="([^"]+)"', rewrite_uri_attr, text)
                body = text.encode("utf-8")

                resp.close()
                return Response(content=body, media_type=content_type)

            def iter_chunks():
                try:
                    while True:
                        chunk = resp.read(256 * 1024)
                        if not chunk:
                            break
                        yield chunk
                finally:
                    resp.close()

            headers = {}
            for header in ("Content-Length", "Accept-Ranges", "Content-Range"):
                value = resp.headers.get(header)
                if value:
                    headers[header] = value
            return StreamingResponse(iter_chunks(), media_type=content_type, headers=headers, status_code=getattr(resp, "status", 200))
        except Exception:
            resp.close()
            raise
    except Exception as e:
        return Response(content=_safe_text(e), status_code=502)
