"""Video source parsing, validation, and topic search service.

All functions are request-context-free and DB-side-effect-free.
Routes and scheduler import from here.
"""

import json
import logging
import re
import subprocess
import urllib.request
from urllib.parse import parse_qs, urljoin, urlparse

logger = logging.getLogger("argus.video_sources")


# ── Helpers ──

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


def _append_source(sources: list[dict], url: str, label: str, source_type: str) -> None:
    if url and not any(s.get("url") == url for s in sources):
        sources.append({"url": url, "label": label, "type": source_type})


def _append_iframe_fallback(sources: list[dict], url: str) -> None:
    fallback = _iframe_fallback_url(url)
    if not any(s.get("url") == fallback for s in sources):
        sources.append({"url": fallback, "label": "Embed fallback", "type": "iframe"})


# ── Core parsing ──

def parse_video_sources(url: str) -> list[dict]:
    """Parse a page URL into playable media sources.

    Tries: direct stream detection → yt-dlp → HTML scraping → headers.
    Returns list of {url, label, type} dicts.
    """
    sources: list[dict] = []

    # Direct stream URLs
    if ".m3u8" in url:
        sources.append({"url": url, "label": "HLS Stream", "type": "hls"})
    elif ".mpd" in url:
        sources.append({"url": url, "label": "DASH Stream", "type": "dash"})
    elif ".mp4" in url:
        sources.append({"url": url, "label": "MP4 Video", "type": "mp4"})

    # yt-dlp
    used_extractor = False
    if not sources:
        try:
            result = subprocess.run(
                ["yt-dlp", "-j", "--no-download", url],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode == 0 and result.stdout.strip():
                used_extractor = True
                info = json.loads(result.stdout)
                title = info.get("title", "Video")

                if info.get("formats"):
                    fmts = info["formats"]

                    hls_fmts = [f for f in fmts
                                if "m3u8" in (f.get("protocol") or "").lower()
                                or ".m3u8" in (f.get("url") or "")]
                    if hls_fmts:
                        best = max(hls_fmts, key=lambda f: f.get("height") or 0)
                        res = best.get("height", "")
                        label = f"{title} (HLS {res}p)" if res else f"{title} (HLS)"
                        _append_source(sources, best["url"], label, "hls")

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

    # HTML scraping fallback
    if not sources:
        try:
            req = urllib.request.Request(url)
            req.add_header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
            with urllib.request.urlopen(req, timeout=15) as resp:
                content_type = resp.headers.get("Content-Type", "")
                if "text/html" in content_type:
                    html = resp.read().decode("utf-8", errors="replace")
                    # url-json meta
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
                            src = stream_data.get("videoSrc") or stream_data
                            for key in ("hls", "hlsASL", "dash", "mp4"):
                                stream_url = src.get(key)
                                if stream_url:
                                    stype = "hls" if "hls" in key else ("dash" if "dash" in key else "video")
                                    label = "HLS Stream" if stype == "hls" else key.upper()
                                    _append_source(sources, stream_url, label, stype)
                        except Exception:
                            pass
                    if not sources:
                        for m in re.finditer(r'https?://[^\s"\'<>]+\.m3u8[^\s"\'<>]*', html):
                            _append_source(sources, m.group(0), "HLS Stream", "hls")
                    if not sources:
                        for m in re.finditer(r'https?://[^\s"\'<>]+\.mpd[^\s"\'<>]*', html):
                            _append_source(sources, m.group(0), "DASH Stream", "dash")
                    if not sources:
                        for m in re.finditer(r'<meta[^>]+(?:og:video|twitter:player)[^>]+content="([^"]+)"', html):
                            _append_source(sources, m.group(1), "Embedded Video", "video")
                    if not sources:
                        for m in re.finditer(r'<(?:video|source)[^>]+src="([^"]+\.(?:m3u8|mpd|mp4)[^"]*)"', html):
                            _append_source(sources, m.group(1), "Video Source", "video")
                elif "mpegurl" in content_type:
                    sources.append({"url": url, "label": "HLS Stream", "type": "hls"})
        except Exception:
            pass

    # Header detection fallback
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

    return sources


# ── Health check ──

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "*/*",
}


def _is_media_healthy(url: str, timeout: int = 10) -> tuple[bool, str]:
    """Check if a media URL is accessible. Returns (ok, reason)."""
    # 1. HEAD
    try:
        req = urllib.request.Request(url, method="HEAD", headers=_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if 200 <= resp.status < 300:
                return True, ""
    except Exception:
        pass

    # 2. GET Range bytes=0-0
    try:
        headers = {**_HEADERS, "Range": "bytes=0-0"}
        req = urllib.request.Request(url, headers=headers)
        resp = urllib.request.urlopen(req, timeout=timeout)
        status = resp.status
        resp.close()
        if (200 <= status < 300) or status == 206:
            return True, ""
        return False, f"http_{status}"
    except Exception as e:
        return False, _classify_error(e)


def _classify_error(e: Exception) -> str:
    """Classify exception into a FailureReason code."""
    s = str(e).lower()
    if "timeout" in s or "timed out" in s:
        return "timeout"
    if "403" in s or "forbidden" in s:
        return "http_403"
    if "404" in s or "not found" in s:
        return "http_404"
    if "connection" in s or "network" in s or "resolve" in s:
        return "network_error"
    return "unknown"


def validate_video_source(source: dict) -> dict:
    """Validate a video source's health. Returns result dict.

    Returns:
        {"status": "ok", "source": source}
        {"status": "replaced", "previousSource": source, "replacements": [...]}
        {"status": "dead", "source": source, "reason": FailureReason}
    """
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    ok, reason = _is_media_healthy(source.get("url", ""))
    if ok:
        source["health"] = "ok"
        source["lastCheckedAt"] = now
        source.pop("failureReason", None)
        return {"status": "ok", "source": source}

    original_url = source.get("originalUrl")
    if original_url:
        try:
            replacements = parse_video_sources(original_url)
            if replacements:
                # Inherit metadata from original source
                for r in replacements:
                    r["originalUrl"] = original_url
                    r["origin"] = source.get("origin", "manual")
                    if source.get("followMode"):
                        r["followMode"] = source["followMode"]
                    if source.get("contentType"):
                        r["contentType"] = source["contentType"]
                    r["health"] = "ok"
                    r["lastResolvedAt"] = now
                    r["lastCheckedAt"] = now
                return {"status": "replaced", "previousSource": source, "replacements": replacements}
            else:
                source["health"] = "dead"
                source["failureReason"] = "reparse_empty"
                source["lastCheckedAt"] = now
                return {"status": "dead", "source": source, "reason": "reparse_empty"}
        except Exception as e:
            err = _classify_error(e)
            source["health"] = "stale"
            source["failureReason"] = err
            source["lastCheckedAt"] = now
            return {"status": "dead", "source": source, "reason": err}

    source["health"] = "dead"
    source["failureReason"] = "no_original_url"
    source["lastCheckedAt"] = now
    return {"status": "dead", "source": source, "reason": "no_original_url"}


# ── Follow search ──

def _extract_source_metadata(item: dict) -> dict:
    """Extract sourceId, channelId, channelName, publishedAt from yt-dlp info."""
    source_id = item.get("id", "")
    channel_id = item.get("channel_id", "") or item.get("uploader_id", "")
    channel_name = item.get("channel", "") or item.get("uploader", "")
    published_at = item.get("upload_date", "")
    # Normalize published_at to ISO date if possible
    if published_at and len(published_at) == 8:
        published_at = f"{published_at[:4]}-{published_at[4:6]}-{published_at[6:]}"
    return {
        "sourceId": source_id,
        "channelId": channel_id,
        "channelName": channel_name,
        "publishedAt": published_at,
    }


def _build_source_from_item(item: dict, content_type: str, follow_mode: str) -> dict | None:
    """Build a VideoSource dict from a yt-dlp info item. Returns None if no playable URL."""
    webpage_url = item.get("webpage_url") or item.get("original_url") or item.get("url", "")
    title = item.get("title", "Video")

    playable_url = ""
    if item.get("formats"):
        hls_fmts = [f for f in item["formats"]
                    if "m3u8" in (f.get("protocol") or "").lower()
                    or ".m3u8" in (f.get("url") or "")]
        if hls_fmts:
            best = max(hls_fmts, key=lambda f: f.get("height") or 0)
            playable_url = best.get("url", "")
        if not playable_url:
            prog_fmts = [f for f in item["formats"]
                         if f.get("url") and ((f.get("ext") or "").lower() in ("mp4", "webm"))]
            if prog_fmts:
                best = max(prog_fmts, key=lambda f: f.get("height") or 0)
                playable_url = best.get("url", "")
    if not playable_url:
        playable_url = item.get("url", "")

    if not playable_url:
        return None

    src_type = "hls" if ".m3u8" in playable_url else "video"
    res = ""
    if item.get("formats"):
        heights = [f.get("height") for f in item["formats"] if f.get("height")]
        if heights:
            res = f"{max(heights)}p"

    label = f"{title} ({res})" if res else title
    meta = _extract_source_metadata(item)

    return {
        "url": playable_url,
        "label": label,
        "type": src_type,
        "originalUrl": webpage_url,
        "origin": "follow",
        "followMode": follow_mode,
        "contentType": content_type,
        "health": "ok",
        **meta,
    }


def search_videos_for_topic(topic: dict) -> list[dict]:
    """Search for videos matching a topic using yt-dlp.

    Args:
        topic: {keyword, selectedTags, contentType, followMode?}

    Returns:
        List of VideoSource dicts with origin="follow".
    """
    keyword = topic.get("keyword", "")
    selected_tags = topic.get("selectedTags", [])
    content_type = topic.get("contentType", "video")
    follow_mode = topic.get("followMode", "live" if content_type == "live" else "topic")

    queries = [f"{keyword} {tag}" for tag in selected_tags] or [keyword]
    all_items = []

    for q in queries:
        try:
            result = subprocess.run(
                ["yt-dlp", "-j", "--no-download", f"ytsearch5:{q}"],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                continue
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    all_items.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        except subprocess.TimeoutExpired:
            logger.warning("yt-dlp timeout for query: %s", q)
        except Exception as e:
            logger.warning("yt-dlp error for query %s: %s", q, e)

    filtered = []
    for item in all_items:
        is_live = item.get("is_live")
        live_status = item.get("live_status")

        if content_type == "live":
            if not (is_live or live_status in ("is_live", "is_upcoming")):
                continue
        else:
            if is_live or live_status in ("is_live", "is_upcoming"):
                continue

        source = _build_source_from_item(item, content_type, follow_mode)
        if source:
            filtered.append(source)

    # Dedupe by URL
    seen = set()
    deduped = []
    for s in filtered:
        if s["url"] not in seen:
            seen.add(s["url"])
            deduped.append(s)

    return deduped


def search_creators(keyword: str) -> list[dict]:
    """Search for channels/creators matching a keyword.

    Returns:
        List of {id, name, url, thumbnail, platform}
    """
    try:
        result = subprocess.run(
            ["yt-dlp", "-j", "--flat-playlist", "--no-download", f"ytsearch5:{keyword}"],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            return []
    except Exception as e:
        logger.warning("yt-dlp creator search error for %s: %s", keyword, e)
        return []

    channels: dict[str, dict] = {}
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue

        ch_id = item.get("channel_id") or item.get("uploader_id", "")
        ch_name = item.get("channel") or item.get("uploader", "")
        ch_url = item.get("channel_url") or item.get("uploader_url", "")
        thumbnail = item.get("thumbnail") or ""

        if not ch_id and not ch_url:
            continue
        key = ch_id or ch_url
        if key in channels:
            continue

        platform = "youtube"
        if "bilibili" in (item.get("extractor") or ""):
            platform = "bilibili"

        channels[key] = {
            "id": ch_id,
            "name": ch_name,
            "url": ch_url,
            "thumbnail": thumbnail,
            "platform": platform,
        }

    return list(channels.values())


def search_videos_for_creator(rule: dict) -> list[dict]:
    """Fetch latest videos from a specific creator/channel.

    Args:
        rule: {channelId?, channelUrl?, keyword?, platform?}

    Returns:
        List of VideoSource dicts (newest-first by publishedAt), capped at 5.
    """
    channel_url = rule.get("channelUrl", "")
    channel_id = rule.get("channelId", "")
    keyword = rule.get("keyword", "")

    # Build yt-dlp target
    if channel_url:
        target = channel_url
    elif channel_id:
        # Try YouTube channel URL
        target = f"https://www.youtube.com/channel/{channel_id}/videos"
    else:
        # Fallback: search by keyword, pick first channel
        creators = search_creators(keyword)
        if not creators:
            return []
        target = creators[0].get("url", "")
        if not target:
            return []

    try:
        result = subprocess.run(
            ["yt-dlp", "-j", "--flat-playlist", "--playlist-end", "5", "--no-download", target],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            logger.warning("yt-dlp creator fetch failed for %s: %s", target, result.stderr[:200])
            return []
    except Exception as e:
        logger.warning("yt-dlp creator fetch error for %s: %s", target, e)
        return []

    sources = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue

        source = _build_source_from_item(item, "video", "creator")
        if source:
            sources.append(source)

    # Sort by publishedAt desc (newest first); preserve feed order if missing
    sources_with_date = [s for s in sources if s.get("publishedAt")]
    sources_without_date = [s for s in sources if not s.get("publishedAt")]
    sources_with_date.sort(key=lambda s: s["publishedAt"], reverse=True)

    return (sources_with_date + sources_without_date)[:5]


# ── RSS latest video ──

def fetch_latest_from_rss(rss_url: str) -> dict | None:
    """Fetch the latest entry from an RSS/Atom feed.

    Returns {title, url, published, channelName} or None if no entries.
    """
    try:
        import feedparser
    except ImportError:
        logger.warning("feedparser not installed")
        return None

    try:
        req = urllib.request.Request(rss_url)
        req.add_header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
        feed = feedparser.parse(content)
        if not feed.entries:
            return None
        entry = feed.entries[0]
        title = entry.get("title", "Video")
        link = entry.get("link", "")
        published = entry.get("published", "")
        channel_name = ""
        if hasattr(feed, "feed"):
            channel_name = getattr(feed.feed, "title", "") or ""
        return {
            "title": title,
            "url": link,
            "published": published,
            "channelName": channel_name,
        }
    except Exception as e:
        logger.warning("RSS fetch error for %s: %s", rss_url, e)
        return None


# ── Topic scoring ──

def score_topic_candidate(item: dict, rule: dict) -> tuple[int, list[str]]:
    """Score a yt-dlp topic search result. Returns (score, reasons)."""
    keyword = rule.get("keyword", "").lower()
    tags = [t.lower() for t in rule.get("selectedTags", rule.get("tags", []))]
    score = 0
    reasons = []

    title = (item.get("title") or "").lower()
    description = (item.get("description") or "").lower()[:500]

    # Playable
    score += 100
    reasons.append("playable")

    # Keyword in title
    if keyword and keyword in title:
        score += 40
        reasons.append("keyword_in_title")
    elif keyword and keyword in description:
        score += 10
        reasons.append("keyword_in_desc")

    # Tag matches
    for tag in tags:
        if tag in title:
            score += 20
            reasons.append(f"tag_in_title:{tag}")
        elif tag in description:
            score += 5
            reasons.append(f"tag_in_desc:{tag}")

    # Recency
    upload_date = item.get("upload_date", "")
    if upload_date and len(upload_date) == 8:
        from datetime import date
        try:
            vid_date = date(int(upload_date[:4]), int(upload_date[4:6]), int(upload_date[6:]))
            days_old = (date.today() - vid_date).days
            if days_old <= 1:
                score += 40
                reasons.append("within_24h")
            elif days_old <= 7:
                score += 25
                reasons.append("within_7d")
            elif days_old <= 30:
                score += 10
                reasons.append("within_30d")
        except (ValueError, TypeError):
            pass

    # View count
    view_count = item.get("view_count") or 0
    if view_count > 1_000_000:
        score += 20
        reasons.append("high_views")
    elif view_count > 100_000:
        score += 10
        reasons.append("medium_views")

    # Live penalty
    is_live = item.get("is_live")
    live_status = item.get("live_status")
    if is_live or live_status in ("is_live", "is_upcoming"):
        score -= 100
        reasons.append("live_penalty")

    return score, reasons


def search_topic_videos(rule: dict) -> list[dict]:
    """Search topic videos with scoring. Returns top 1-3 scored sources.

    Args:
        rule: {keyword, tags?, platform?}
    """
    # Build search topic dict
    topic = {
        "keyword": rule.get("keyword", ""),
        "selectedTags": rule.get("tags", []),
        "contentType": "video",
        "followMode": "topic",
    }

    keyword = topic["keyword"]
    tags = topic["selectedTags"]
    platform = rule.get("platform", "auto")

    queries = [f"{keyword} {tag}" for tag in tags] or [keyword]
    all_items = []

    for q in queries:
        try:
            cmd = ["yt-dlp", "-j", "--no-download", f"ytsearch5:{q}"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                continue
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    all_items.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        except Exception:
            continue

    # Filter out live
    filtered = []
    for item in all_items:
        is_live = item.get("is_live")
        live_status = item.get("live_status")
        if is_live or live_status in ("is_live", "is_upcoming"):
            continue

        # Platform filter
        extractor = item.get("extractor", "")
        if platform == "youtube" and "bilibili" in extractor:
            continue
        if platform == "bilibili" and "bilibili" not in extractor:
            continue

        source = _build_source_from_item(item, "video", "topic")
        if source:
            score, reasons = score_topic_candidate(item, rule)
            source["score"] = score
            source["scoreReason"] = reasons
            filtered.append(source)

    # Dedupe by URL
    seen = set()
    deduped = []
    for s in filtered:
        if s["url"] not in seen:
            seen.add(s["url"])
            deduped.append(s)

    # Sort by score
    deduped.sort(key=lambda s: s.get("score", 0), reverse=True)

    return deduped[:3]


# ── Feed-based creator ──

def fetch_latest_from_feed(rule: dict) -> list[dict]:
    """Fetch latest video from a creator's RSS/feed.

    Args:
        rule: {feedUrl?, keyword?}

    Returns:
        List of 0-1 VideoSource dicts with origin="follow", followMode="creator".
    """
    feed_url = rule.get("feedUrl", "")
    if not feed_url:
        return []

    entry = fetch_latest_from_rss(feed_url)
    if not entry or not entry.get("url"):
        return []

    # Parse the entry link for playable sources
    try:
        sources = parse_video_sources(entry["url"])
    except Exception:
        sources = []

    if not sources:
        return []

    # Use the best source (first one)
    best = sources[0]
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    return [{
        "url": best["url"],
        "label": entry.get("title", best.get("label", "Video")),
        "type": best.get("type", "video"),
        "originalUrl": entry["url"],
        "discoveryUrl": feed_url,
        "sourceKind": "page",
        "origin": "follow",
        "followMode": "creator",
        "health": "ok",
        "channelName": entry.get("channelName", ""),
        "publishedAt": entry.get("published", ""),
        "lastResolvedAt": now,
        "lastCheckedAt": now,
    }]


def only_newer_than_current(results: list[dict], current: dict | None) -> list[dict]:
    """Filter results to only newer than current. Used by creator follow."""
    if not current:
        return results[:1]
    if current.get("health") in ("stale", "dead"):
        return results[:1]
    current_published = current.get("publishedAt")
    if not current_published:
        return []
    newer = [r for r in results if r.get("publishedAt") and r["publishedAt"] > current_published]
    return newer[:1]
