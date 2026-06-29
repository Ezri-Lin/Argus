"""Video parsing, stat API proxy, and stream proxy endpoints."""

import json
import re
import urllib.request
from urllib.parse import quote, urljoin, urlparse

from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from .ai_helpers import _safe_text
from .services.video_sources import (
    parse_video_sources, validate_video_source,
    search_topic_videos, search_creators, fetch_latest_from_rss,
    fetch_latest_from_feed,
)
from .services.live_discovery import discover_live_sources

router = APIRouter(prefix="/ai", tags=["ai"])


# ── Parse Video ──

class ParseVideoRequest(BaseModel):
    url: str


@router.post("/parse-video")
def parse_video(body: ParseVideoRequest, request: Request):
    """Parse a URL into playable media sources."""
    sources = parse_video_sources(body.url.strip())
    return {"ok": True, "sources": sources}


# ── Validate Source ──

class ValidateSourceRequest(BaseModel):
    url: str
    originalUrl: str = ""
    origin: str = "manual"
    contentType: str = ""


@router.post("/validate-source")
def validate_source(body: ValidateSourceRequest):
    """Check if a stream URL is alive. If dead, re-parse from originalUrl."""
    source = {
        "url": body.url.strip(),
        "originalUrl": body.originalUrl.strip() if body.originalUrl else "",
        "origin": body.origin,
    }
    if body.contentType:
        source["contentType"] = body.contentType

    result = validate_video_source(source)
    return {"ok": True, **result}


# ── Discover Topics ──

class DiscoverTopicsRequest(BaseModel):
    keyword: str
    contentType: str = "video"


@router.post("/discover-topics")
def discover_topics(body: DiscoverTopicsRequest):
    """Use AI to generate related sub-topics for a keyword."""
    from pipeline.db import get_db, get_model_for_role
    from pipeline.models import call_model
    import os

    db_path = os.environ.get("ARGUS_DB_PATH", "data/argus.db")
    conn = get_db(db_path)
    model = get_model_for_role(conn, "base")
    conn.close()

    if not model:
        return {"ok": False, "error": "No base model configured"}

    content_desc = "live streams" if body.contentType == "live" else "recorded videos"
    prompt = (
        f"Given the keyword '{body.keyword}', suggest 3-5 related sub-topics for finding {content_desc}.\n"
        f"Return ONLY a JSON array of strings, e.g. [\"sub1\", \"sub2\", \"sub3\"]\n"
        f"Keep each tag short (1-3 words). Focus on specific, searchable terms."
    )

    try:
        tags = call_model(
            model,
            "You are a video content discovery assistant. Return only valid JSON arrays.",
            prompt,
        )
        if isinstance(tags, list):
            return {"ok": True, "tags": [str(t) for t in tags[:5]]}
        return {"ok": False, "error": "AI did not return valid JSON"}
    except Exception as e:
        return {"ok": False, "error": _safe_text(e)}


# ── Search Videos / Resolve Follow Sources ──

class SearchVideosRequest(BaseModel):
    mode: Literal["live", "topic", "creator"]
    keyword: str = ""
    tags: list[str] = Field(default_factory=list)
    platform: str = "auto"
    quality: str = "auto"
    feedUrl: str = ""
    discoveryProviders: list[str] = Field(default_factory=list)
    liveKind: str = ""


@router.post("/search-videos")
def search_videos(body: SearchVideosRequest):
    """Discover or search sources for a follow rule. Returns VideoSource[] with origin stamped."""
    try:
        rule = body.model_dump()

        if body.mode == "live":
            sources = discover_live_sources(rule)
        elif body.mode == "creator":
            if not body.feedUrl.strip():
                raise HTTPException(status_code=400, detail="feedUrl is required for creator mode")
            sources = fetch_latest_from_feed(rule)
        else:
            sources = search_topic_videos(rule)

        for s in sources:
            s["origin"] = "follow"
            s["followMode"] = body.mode
            s.setdefault("health", "ok")

        return {"ok": True, "sources": sources}
    except HTTPException:
        raise
    except Exception as e:
        return {"ok": False, "error": _safe_text(e)}


# ── Search Creators (legacy helper) ──

class SearchCreatorsRequest(BaseModel):
    keyword: str


@router.post("/search-creators")
def search_creators_endpoint(body: SearchCreatorsRequest):
    """Search for channels/creators matching a keyword. Legacy helper — creator follow uses RSS/feed."""
    try:
        channels = search_creators(body.keyword)
        return {"ok": True, "channels": channels}
    except Exception as e:
        return {"ok": False, "error": _safe_text(e)}


# ── Parse RSS ──

class ParseRssRequest(BaseModel):
    url: str


@router.post("/parse-rss")
def parse_rss(body: ParseRssRequest):
    """Fetch the latest entry from an RSS/Atom feed."""
    result = fetch_latest_from_rss(body.url.strip())
    if not result:
        return {"ok": False, "error": "No entries found or feed unreachable"}
    return {"ok": True, "entry": result}


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

            if is_manifest:
                body = resp.read()
                content_type = "application/vnd.apple.mpegurl"
                text = body.decode("utf-8", errors="replace")
                # Use the post-redirect URL as base so relative m3u8 segments
                # resolve against the actual CDN (e.g. 198.204.228.26:82), not
                # the entry URL's host:port. Without this, segments 404 when
                # the gateway 302s to a different port/host.
                final_url = resp.geturl()
                parsed = urlparse(final_url)
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
                text = re.sub(r'^(?!#)(.+\.m3u8.*)$', rewrite_segment, text, flags=re.MULTILINE)
                text = re.sub(r'^(?!#)(.+\.mp4)$', rewrite_segment, text, flags=re.MULTILINE)
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
