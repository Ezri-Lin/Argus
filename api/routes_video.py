"""Video parsing, stat API proxy, and stream proxy endpoints."""

import json
import re
import subprocess
import urllib.request
from urllib.parse import parse_qs, quote, urljoin, urlparse

from fastapi import APIRouter, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from .ai_helpers import _safe_text

router = APIRouter(prefix="/ai", tags=["ai"])


# ── Video Helpers ──

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


# ── Parse Video ──

class ParseVideoRequest(BaseModel):
    url: str


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

    # Fallback: parse HTML for stream URLs (meta tags, inline JSON, <source>/<video>)
    if not sources:
        try:
            req = urllib.request.Request(url)
            req.add_header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
            with urllib.request.urlopen(req, timeout=15) as resp:
                content_type = resp.headers.get("Content-Type", "")
                if "text/html" in content_type:
                    html = resp.read().decode("utf-8", errors="replace")
                    # 1. Look for url-json meta (Apple Events pattern)
                    meta_match = re.search(r'property="url-json"\s+content="([^"]+)"', html)
                    if not meta_match:
                        meta_match = re.search(r'content="([^"]+)"\s+property="url-json"', html)
                    if meta_match:
                        try:
                            json_url = meta_match.group(1)
                            json_req = urllib.request.Request(json_url)
                            json_req.add_header("User-Agent", "Mozilla/5.0")
                            with urllib.request.urlopen(json_req, timeout=10) as json_resp:
                                stream_data = json.loads(json_resp.read())
                            # Navigate: {"videoSrc": {"hls": "url", ...}} or {"hls": "url"}
                            src = stream_data.get("videoSrc") or stream_data
                            for key in ("hls", "hlsASL", "dash", "mp4"):
                                stream_url = src.get(key)
                                if stream_url:
                                    stype = "hls" if "hls" in key else ("dash" if "dash" in key else "video")
                                    label = "HLS Stream" if stype == "hls" else key.upper()
                                    _append_source(sources, stream_url, label, stype)
                        except Exception:
                            pass
                    # 2. Regex: find .m3u8 URLs in HTML
                    if not sources:
                        for m in re.finditer(r'https?://[^\s"\'<>]+\.m3u8[^\s"\'<>]*', html):
                            _append_source(sources, m.group(0), "HLS Stream", "hls")
                    # 3. Regex: find .mpd URLs in HTML
                    if not sources:
                        for m in re.finditer(r'https?://[^\s"\'<>]+\.mpd[^\s"\'<>]*', html):
                            _append_source(sources, m.group(0), "DASH Stream", "dash")
                    # 4. og:video / twitter:player meta tags
                    if not sources:
                        for m in re.finditer(r'<meta[^>]+(?:og:video|twitter:player)[^>]+content="([^"]+)"', html):
                            _append_source(sources, m.group(1), "Embedded Video", "video")
                    # 5. <video src="..."> or <source src="...">
                    if not sources:
                        for m in re.finditer(r'<(?:video|source)[^>]+src="([^"]+\.(?:m3u8|mpd|mp4)[^"]*)"', html):
                            _append_source(sources, m.group(1), "Video Source", "video")
                elif "mpegurl" in content_type:
                    sources.append({"url": url, "label": "HLS Stream", "type": "hls"})
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
