"""Live source discovery — event entity expansion → source-specific retrieval.

Pipeline: keyword → channel discovery → IPTV channel-alias search + SearXNG internet search
→ normalize → dedupe → validate → score → rank → top 3.

No DB side effects. Routes and scheduler import from here.

# TODO(split): live_discovery.py is near the 1000-line hard limit.
# Split channel discovery, IPTV matching, SearXNG extraction, and ranking
# into focused modules before adding new discovery providers.
"""

import json
import logging
import os
import re
import subprocess
import urllib.request
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

logger = logging.getLogger("argus.live_discovery")

_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
_HEADERS = {"User-Agent": _UA, "Accept": "*/*"}

M3U8_RE = re.compile(r'https?://[^\s"\'<>]+\.m3u8[^\s"\'<>]*', re.IGNORECASE)

_BLACKLIST_RE = re.compile(
    r'(replay|highlights|game\s*recap|watchalong|compilation|best\s*moments)',
    re.IGNORECASE,
)

# ── Channel name detection & normalization ──

_CHANNEL_NAME_RE = re.compile(
    r"\b(cctv\s*-?\s*\d+\s*(?:\+|plus)?|nhk|bbc|espn|tnt|fox\s*sports|sky\s*sports)\b",
    re.I,
)

_SOURCE_PRIOR = {
    "iptv_channel": 0.75,
    "iptv_keyword": 0.45,
    "searxng": 0.35,
    "ai": 0.30,
    "web": 0.35,
    "github": 0.40,
}

_TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid",
}

_SUPPORTED_PLATFORMS_RE = re.compile(
    r"(youtube\.com|youtu\.be|bilibili\.com|twitch\.tv|douyin\.com|twitter\.com|x\.com)",
    re.I,
)

_IFRAME_PLATFORMS_RE = re.compile(
    r"(youtube\.com|youtu\.be|bilibili\.com|player\.bilibili\.com|twitch\.tv)",
    re.I,
)


def _normalize_channel(value: str) -> str:
    """Normalize channel name for matching. NOT for URLs."""
    return re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "", (value or "").casefold())


def _looks_like_channel_name(value: str) -> bool:
    return bool(_CHANNEL_NAME_RE.search(value or ""))


def _dedupe_channel_names(channels: list[str]) -> list[str]:
    """Dedupe channel names preserving original display name."""
    seen: set[str] = set()
    result: list[str] = []
    for channel in channels:
        name = (channel or "").strip()
        if not name:
            continue
        key = _normalize_channel(name)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(name)
    return result


def _dedupe_url_key(url: str) -> str:
    """Canonicalize URL for dedupe: strip tracking params, trailing slashes."""
    parsed = urlparse((url or "").strip())
    host = parsed.netloc.lower()
    path = re.sub(r"/+$", "", parsed.path)
    query_items = [
        (k, v)
        for k, v in parse_qsl(parsed.query, keep_blank_values=True)
        if k.lower() not in _TRACKING_PARAMS
    ]
    return urlunparse((parsed.scheme.lower(), host, path, "", urlencode(sorted(query_items)), ""))


def _channel_matches(query: str, entry_name: str) -> bool:
    """Check if entry_name matches query channel. Handles CCTV numeric families."""
    nq = _normalize_channel(query)
    nn = _normalize_channel(entry_name)
    if not nq or not nn:
        return False
    # CCTV numeric family: check BEFORE nq==nn because normalize strips +
    cctv_query = re.fullmatch(r"cctv(\d+)(plus)?", nq)
    if cctv_query:
        query_number = cctv_query.group(1)
        # Detect plus from ORIGINAL query, because _normalize_channel strips "+"
        query_plus = bool(re.search(r"(?:\+|plus)\s*$", query or "", re.I))
        original = entry_name or ""
        pattern = re.compile(
            rf"cctv\s*-?\s*{re.escape(query_number)}\s*(\+|plus)?(?!\d)",
            re.I,
        )
        for match in pattern.finditer(original):
            entry_plus = bool(match.group(1))
            if query_plus:
                if entry_plus:
                    return True
            else:
                if not entry_plus:
                    return True
        return False
    return nq in nn


# ── Channel discovery (event → broadcast channels) ──

def _discover_channels_ai(keyword: str, tags: list[str]) -> list[str]:
    """Use AI to find which TV channels broadcast this event."""
    try:
        from pipeline.db import get_db, get_model_for_role
        from pipeline.models import call_model as pipeline_call_model

        db_path = os.environ.get("ARGUS_DB_PATH", "data/argus.db")
        conn = get_db(db_path)
        model = get_model_for_role(conn, "base")
        conn.close()
        if not model:
            return []

        tag_str = ", ".join(tags) if tags else ""
        prompt = (
            f'Which TV channels or networks have broadcast/streaming rights for "{keyword}"?'
            f'{f" Context: {tag_str}" if tag_str else ""}\n\n'
            "Return ONLY a JSON array of channel name strings. No markdown, no explanation.\n"
            'Example: ["CCTV5", "BBC One", "Fox Sports", "NHK"]'
        )
        result = pipeline_call_model(
            model,
            "You are a broadcast rights researcher. Return only valid JSON arrays.",
            prompt,
        )
        # Parse JSON array
        if isinstance(result, list):
            return [str(ch) for ch in result if isinstance(ch, str) and ch.strip()]
        if isinstance(result, str):
            text = result.strip()
            # Try direct JSON parse
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    return [str(ch) for ch in parsed if isinstance(ch, str) and ch.strip()]
            except json.JSONDecodeError:
                pass
            # Regex fallback: extract quoted strings
            return re.findall(r'"([^"]+)"', text)
        return []
    except Exception:
        return []


def _discover_channels_tavily(keyword: str, tags: list[str]) -> list[str]:
    """Use Tavily to find broadcast channel names from search results."""
    try:
        from pipeline.db import get_db

        db_path = os.environ.get("ARGUS_DB_PATH", "data/argus.db")
        conn = get_db(db_path)
        row = conn.execute("SELECT value FROM settings WHERE key = 'tavily_api_key'").fetchone()
        api_key = (row["value"] if row else "") or os.environ.get("TAVILY_API_KEY", "")
        conn.close()
        if not api_key:
            return []

        query = f'"{keyword}" broadcast rights TV channels'
        req = urllib.request.Request(
            "https://api.tavily.com/search",
            data=json.dumps({"api_key": api_key, "query": query, "max_results": 5}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        channels: set[str] = set()
        # Extract channel names from snippets
        channel_patterns = re.compile(
            r"\b(CCTV-?\d+\+?|NHK|BBC\s*\w*|ESPN|TNT|Fox\s*Sports|Sky\s*Sports"
            r"|Star\s*Sports|beIN\s*Sports|DAZN|Canal\+|Movistar|TSN|Sportsnet)\b",
            re.I,
        )
        for r in data.get("results", []):
            text = f"{r.get('title', '')} {r.get('content', '')}"
            for m in channel_patterns.finditer(text):
                channels.add(m.group(0).strip())
        return list(channels)
    except Exception:
        return []


def _discover_channels(keyword: str, tags: list[str]) -> list[str]:
    """Event → broadcast channel entity expansion. Fail-open."""
    channels: set[str] = set()
    if _looks_like_channel_name(keyword):
        channels.add(keyword)
    try:
        channels.update(_discover_channels_ai(keyword, tags))
    except Exception:
        logger.debug("AI channel discovery failed", exc_info=True)
    try:
        channels.update(_discover_channels_tavily(keyword, tags))
    except Exception:
        logger.debug("Tavily channel discovery failed", exc_info=True)
    return _dedupe_channel_names(list(channels))


# ── m3u8 extraction ──

def extract_m3u8_candidates(text: str, discovery_url: str | None = None) -> list[dict]:
    """Extract m3u8 URLs from text (HTML, m3u playlist, plain text)."""
    candidates = []
    seen = set()
    for m in M3U8_RE.finditer(text):
        url = m.group(0).rstrip("/")
        if url not in seen:
            seen.add(url)
            candidates.append({
                "url": url,
                "discoveryUrl": discovery_url or "",
                "originalUrl": discovery_url or "",
                "sourceKind": "m3u8",
                "type": "hls",
            })
    return candidates


# ── m3u8 validation ──

def _fetch_text(url: str, timeout: int = 10) -> str | None:
    try:
        req = urllib.request.Request(url, headers=_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception:
        return None


def _is_master_playlist(text: str) -> bool:
    return "#EXT-X-STREAM-INF" in text


def _parse_variants(text: str, base_url: str) -> list[dict]:
    """Parse master playlist variants. Returns [{url, bandwidth, width, height, fps}]."""
    variants = []
    lines = text.strip().splitlines()
    for i, line in enumerate(lines):
        if not line.startswith("#EXT-X-STREAM-INF:"):
            continue
        attrs = line[len("#EXT-X-STREAM-INF:"):]
        bandwidth = 0
        width = height = 0
        fps = 0.0
        bm = re.search(r'BANDWIDTH=(\d+)', attrs)
        if bm:
            bandwidth = int(bm.group(1))
        rm = re.search(r'RESOLUTION=(\d+)x(\d+)', attrs)
        if rm:
            width, height = int(rm.group(1)), int(rm.group(2))
        fm = re.search(r'FRAME-RATE=([\d.]+)', attrs)
        if fm:
            fps = float(fm.group(1))
        # Next non-comment line is the URI
        for j in range(i + 1, len(lines)):
            uri = lines[j].strip()
            if uri and not uri.startswith("#"):
                full_url = urljoin(base_url, uri) if not uri.startswith("http") else uri
                variants.append({
                    "url": full_url,
                    "bandwidth": bandwidth,
                    "width": width,
                    "height": height,
                    "fps": fps,
                })
                break
    return variants


def _parse_segment_urls(text: str, base_url: str) -> list[str]:
    """Extract media segment URLs from a media playlist."""
    urls = []
    for line in text.strip().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            full = urljoin(base_url, line) if not line.startswith("http") else line
            urls.append(full)
    return urls


def _select_variant(variants: list[dict], quality: str) -> dict | None:
    """Pick best variant matching quality preference."""
    if not variants:
        return None
    if quality == "4k":
        prefer = [v for v in variants if (v.get("height") or 0) >= 2160]
        if not prefer:
            prefer = [v for v in variants if (v.get("height") or 0) >= 1440]
        if not prefer:
            prefer = [v for v in variants if (v.get("height") or 0) >= 1080]
        if prefer:
            return max(prefer, key=lambda v: v.get("height") or 0)
    elif quality == "1080p":
        prefer = [v for v in variants if (v.get("height") or 0) >= 1080]
        if prefer:
            return max(prefer, key=lambda v: v.get("height") or 0)
    return max(variants, key=lambda v: v.get("bandwidth") or 0)


def validate_m3u8_source(candidate: dict, quality: str = "auto") -> dict | None:
    """Validate m3u8 playlist + segment. Returns enriched candidate or None.

    Steps: GET playlist → if master, parse & select variant → GET variant → GET first segment.
    """
    url = candidate["url"]
    playlist_text = _fetch_text(url)
    if not playlist_text or "#EXTM3U" not in playlist_text:
        return None

    result = {**candidate}
    target_url = url

    if _is_master_playlist(playlist_text):
        variants = _parse_variants(playlist_text, url)
        if not variants:
            return None
        selected = _select_variant(variants, quality)
        if not selected:
            return None
        target_url = selected["url"]
        result["width"] = selected.get("width")
        result["height"] = selected.get("height")
        result["bandwidth"] = selected.get("bandwidth")
        result["fps"] = selected.get("fps")
        result["url"] = target_url
        # Re-fetch variant playlist
        playlist_text = _fetch_text(target_url)
        if not playlist_text or "#EXTM3U" not in playlist_text:
            return None

    # Parse media segments
    segments = _parse_segment_urls(playlist_text, target_url)
    if not segments:
        # Might be a live playlist with no segments yet — treat as playable if valid
        if "#EXTINF" in playlist_text or "#EXT-X-ENDLIST" in playlist_text:
            result["stability"] = "volatile"
            return result
        return None

    # Validate first segment
    seg_url = segments[0]
    try:
        req = urllib.request.Request(seg_url, method="HEAD", headers=_HEADERS)
        with urllib.request.urlopen(req, timeout=8) as resp:
            if not (200 <= resp.status < 300):
                return None
    except Exception:
        # HEAD failed, try GET Range
        try:
            headers = {**_HEADERS, "Range": "bytes=0-0"}
            req = urllib.request.Request(seg_url, headers=headers)
            resp = urllib.request.urlopen(req, timeout=8)
            status = resp.status
            resp.close()
            if not ((200 <= status < 300) or status == 206):
                return None
        except Exception:
            return None

    result["stability"] = "stable"
    return result


# ── Provider: web search (yt-dlp as web scraper) ──

def _search_web(keyword: str, tags: list[str]) -> list[str]:
    """Search for pages likely containing live m3u8 streams."""
    queries = [
        f"{keyword} {' '.join(tags)} live m3u8",
        f"{keyword} {' '.join(tags)} IPTV",
        f"{keyword} live stream m3u8",
    ]
    urls = []
    for q in queries[:2]:  # cap queries
        try:
            result = subprocess.run(
                ["yt-dlp", "-j", "--flat-playlist", "--no-download", f"ytsearch3:{q}"],
                capture_output=True, text=True, timeout=20,
            )
            if result.returncode != 0:
                continue
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    item = __import__("json").loads(line)
                    url = item.get("webpage_url") or item.get("url", "")
                    if url:
                        urls.append(url)
                except Exception:
                    continue
        except Exception:
            continue
    return urls


# ── Provider: GitHub IPTV lists ──

def _search_github(keyword: str) -> list[str]:
    """Search for GitHub IPTV/m3u8 lists matching keyword."""
    queries = [
        f"{keyword} iptv m3u8 site:github.com",
    ]
    urls = []
    for q in queries:
        try:
            result = subprocess.run(
                ["yt-dlp", "-j", "--flat-playlist", "--no-download", f"ytsearch3:{q}"],
                capture_output=True, text=True, timeout=20,
            )
            if result.returncode != 0:
                continue
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    item = __import__("json").loads(line)
                    url = item.get("webpage_url") or item.get("url", "")
                    if url and "github" in url.lower():
                        urls.append(url)
                except Exception:
                    continue
        except Exception:
            continue
    return urls


def _fetch_page_and_extract(url: str) -> list[dict]:
    """Fetch a page and extract m3u8 candidates from its content."""
    try:
        req = urllib.request.Request(url, headers=_HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            text = resp.read().decode("utf-8", errors="replace")

        # If it's a raw m3u file, extract directly
        if "#EXTM3U" in text:
            return extract_m3u8_candidates(text, url)

        # If it's HTML, extract m3u8 URLs
        if "text/html" in content_type or "<html" in text.lower():
            return extract_m3u8_candidates(text, url)

        # Plain text — try extraction
        return extract_m3u8_candidates(text, url)
    except Exception:
        return []


# ── Provider: direct IPTV list fetch (no yt-dlp) ──

_IPTV_LIST_URLS = [
    # iptv-org — country/region m3u files
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cn.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/hk.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/tw.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/uk.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/jp.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/kr.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/fr.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/de.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/br.m3u",
    # iptv-org categories
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/news.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/sports.m3u",
    "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/entertainment.m3u",
    # Popular Chinese IPTV lists
    "https://raw.githubusercontent.com/YueChan/Live/main/IPTV.m3u",
    "https://raw.githubusercontent.com/YanG-1989/m3u/main/TV.m3u",
    "https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/ipv6.m3u",
]


def _parse_m3u_entries(text: str, source_url: str) -> list[dict]:
    """Parse EXTINF entries from m3u text. Returns [{name, url, group, discoveryUrl}]."""
    entries = []
    lines = text.strip().splitlines()
    current_name = ""
    current_group = ""
    for line in lines:
        line = line.strip()
        if line.startswith("#EXTINF:"):
            # Extract tvg-name or display name
            name_m = re.search(r'tvg-name="([^"]*)"', line)
            group_m = re.search(r'group-title="([^"]*)"', line)
            # Fallback: last comma-separated part
            comma_idx = line.rfind(",")
            display = line[comma_idx + 1:].strip() if comma_idx >= 0 else ""
            current_name = (name_m.group(1) if name_m else display) or display
            current_group = group_m.group(1) if group_m else ""
        elif line and not line.startswith("#"):
            if current_name or line.startswith("http"):
                entries.append({
                    "name": current_name,
                    "url": line,
                    "group": current_group,
                    "discoveryUrl": source_url,
                })
            current_name = ""
            current_group = ""
    return entries


def _keyword_matches(text: str, keyword: str, tags: list[str]) -> bool:
    """Check if text matches keyword or any tag (case-insensitive)."""
    t = text.lower()
    kw = keyword.lower()
    if kw in t:
        return True
    for tag in tags:
        if tag.lower() in t:
            return True
    return False


def _fetch_iptv_lists(channel_names: list[str], keyword: str, tags: list[str]) -> list[dict]:
    """Fetch IPTV lists, matching by channel names first, then keyword fallback."""
    candidates = []
    seen_urls: set[str] = set()
    per_channel_count: dict[str, int] = {}

    for list_url in _IPTV_LIST_URLS[:8]:
        try:
            req = urllib.request.Request(list_url, headers=_HEADERS)
            with urllib.request.urlopen(req, timeout=6) as resp:
                text = resp.read().decode("utf-8", errors="replace")
            if "#EXTM3U" not in text:
                continue

            entries = _parse_m3u_entries(text, list_url)
            for entry in entries:
                if entry["url"] in seen_urls:
                    continue
                haystack = f"{entry['name']} {entry['group']}"

                # Phase 1: channel name match (priority)
                matched_channel = ""
                for ch in channel_names:
                    if _channel_matches(ch, haystack):
                        count = per_channel_count.get(ch, 0)
                        if count >= 3:  # cap per channel
                            continue
                        per_channel_count[ch] = count + 1
                        matched_channel = ch
                        break

                if matched_channel:
                    seen_urls.add(entry["url"])
                    candidates.append({
                        "url": entry["url"],
                        "label": entry["name"],
                        "discoveryUrl": list_url,
                        "originalUrl": list_url,
                        "sourceKind": "m3u8",
                        "type": "hls",
                        "source": "iptv_channel",
                        "matched_channel": matched_channel,
                        "confidence": 0.75,
                    })
                elif _keyword_matches(haystack, keyword, tags):
                    # Phase 2: keyword fallback
                    seen_urls.add(entry["url"])
                    candidates.append({
                        "url": entry["url"],
                        "label": entry["name"],
                        "discoveryUrl": list_url,
                        "originalUrl": list_url,
                        "sourceKind": "m3u8",
                        "type": "hls",
                        "source": "iptv_keyword",
                        "confidence": 0.45,
                    })
        except Exception:
            continue

    # If channel matches too few, supplement with keyword search
    channel_matches = [c for c in candidates if c.get("source") == "iptv_channel"]
    if len(channel_matches) < 2:
        # Already populated via keyword fallback above
        pass

    return candidates


# ── Provider: Tavily deep search ──

def _search_tavily(keyword: str, tags: list[str]) -> list[dict]:
    """Use Tavily API to search for m3u8/IPTV sources."""
    try:
        from pipeline.db import get_db

        db_path = os.environ.get("ARGUS_DB_PATH", "data/argus.db")
        conn = get_db(db_path)
        row = conn.execute("SELECT value FROM settings WHERE key = 'tavily_api_key'").fetchone()
        api_key = (row["value"] if row else "") or os.environ.get("TAVILY_API_KEY", "")
        conn.close()

        if not api_key:
            return []

        tag_str = " ".join(tags)
        # Search for actual m3u8 stream URLs, not informational pages
        queries = [
            f'"{keyword}" m3u8 live stream url',
            f'"{keyword}" iptv m3u playlist github',
        ]
        if tag_str:
            queries.insert(0, f'"{keyword}" {tag_str} m3u8')

        candidates = []
        seen_urls: set[str] = set()
        for q in queries[:2]:  # cap queries
            try:
                req = urllib.request.Request(
                    "https://api.tavily.com/search",
                    data=json.dumps({"api_key": api_key, "query": q, "max_results": 8}).encode(),
                    headers={"Content-Type": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read())
            except Exception:
                continue

            for r in data.get("results", []):
                url = r.get("url", "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                if ".m3u8" in url or ".m3u" in url:
                    candidates.append({
                        "url": url,
                        "label": r.get("title", ""),
                        "discoveryUrl": url,
                        "originalUrl": url,
                        "sourceKind": "m3u8",
                        "type": "hls",
                    })
                else:
                    candidates.append({
                        "url": url,
                        "discoveryUrl": url,
                        "originalUrl": url,
                        "sourceKind": "page",
                        "type": "hls",
                    })
        return candidates
    except Exception as e:
        logger.debug("Tavily search failed: %s", e)
        return []


# ── Provider: AI-assisted source suggestion ──

def _ai_suggest_sources(keyword: str, tags: list[str]) -> list[dict]:
    """Use Argus's configured AI model to suggest m3u8/IPTV source URLs."""
    try:
        from pipeline.db import get_db, get_model_for_role
        from pipeline.models import call_model as pipeline_call_model

        db_path = os.environ.get("ARGUS_DB_PATH", "data/argus.db")
        conn = get_db(db_path)
        model = get_model_for_role(conn, "base")
        conn.close()

        if not model:
            return []

        tag_str = ", ".join(tags) if tags else ""
        prompt = (
            f"I need live streaming m3u8 URLs for: {keyword}"
            f"{f' (tags: {tag_str})' if tag_str else ''}.\n\n"
            "Suggest 3-5 specific m3u8 playlist URLs or IPTV source URLs that might have this content.\n"
            "Focus on:\n"
            "- Known public IPTV streams\n"
            "- News/sports/event live streams\n"
            "- GitHub IPTV list URLs (raw .m3u files)\n\n"
            "Return ONLY a JSON array of URL strings, e.g. [\"https://example.com/stream.m3u8\", ...]\n"
            "If you don't know specific URLs, suggest GitHub repo URLs that host IPTV lists."
        )

        result = pipeline_call_model(
            model,
            "You are a live streaming source finder. Return only valid JSON arrays of URLs.",
            prompt,
        )

        if not isinstance(result, list):
            return []

        candidates = []
        for url in result:
            if not isinstance(url, str) or not url.startswith("http"):
                continue
            candidates.append({
                "url": url,
                "discoveryUrl": "ai:suggest",
                "originalUrl": "ai:suggest",
                "sourceKind": "m3u8" if ".m3u" in url or ".m3u8" in url else "page",
                "type": "hls",
            })
        return candidates
    except Exception as e:
        logger.debug("AI suggest failed: %s", e)
        return []


# ── SearXNG internet stream search ──

def _is_supported_video_platform(url: str) -> bool:
    return bool(_SUPPORTED_PLATFORMS_RE.search(url or ""))


def _is_iframe_candidate(url: str) -> bool:
    return bool(_IFRAME_PLATFORMS_RE.search(url or ""))


def _extract_with_ytdlp(url: str) -> list[dict]:
    """Extract stream info from a video platform page via yt-dlp."""
    try:
        result = subprocess.run(
            ["yt-dlp", "-j", "--no-download", url],
            capture_output=True, text=True, timeout=25,
        )
        if result.returncode != 0:
            return []
        candidates = []
        for line in result.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
                stream_url = item.get("url") or item.get("webpage_url", "")
                if not stream_url:
                    continue
                is_live = item.get("is_live") or item.get("live_status") in ("is_live", "is_upcoming")
                candidates.append({
                    "url": stream_url,
                    "label": item.get("title", ""),
                    "type": "hls" if is_live else "video",
                    "sourceKind": "m3u8" if ".m3u8" in stream_url else "platform",
                    "source": "searxng",
                    "extractor": "yt-dlp",
                    "confidence": 0.8,
                })
            except json.JSONDecodeError:
                continue
        return candidates
    except Exception:
        return []


def _extract_stream_from_result(url: str, title: str = "") -> list[dict]:
    """Cascading extraction: yt-dlp → HTML m3u8 → iframe fallback."""
    candidates: list[dict] = []
    if _is_supported_video_platform(url):
        try:
            candidates.extend(_extract_with_ytdlp(url))
        except Exception:
            logger.debug("yt-dlp failed: %s", url, exc_info=True)
    if not candidates:
        try:
            candidates.extend(_fetch_page_and_extract(url))
        except Exception:
            logger.debug("HTML extraction failed: %s", url, exc_info=True)
    if not candidates and _is_iframe_candidate(url):
        candidates.append({
            "url": url,
            "type": "iframe",
            "source": "searxng",
            "extractor": "iframe_fallback",
            "confidence": 0.35,
            "name": title or url,
        })
    return candidates


def _search_searxng_streams(keyword: str, tags: list[str], channels: list[str] | None = None) -> list[dict]:
    """Use SearXNG to find live streams on the internet."""
    channels = channels or []
    candidates: list[dict] = []
    try:
        from pipeline.db import get_db
        from pipeline.search.router import SearchRouter

        db_path = os.environ.get("ARGUS_DB_PATH", "data/argus.db")
        conn = get_db(db_path)
        router = SearchRouter(conn, profile="api")

        queries = [f"{keyword} live stream"]
        tag_str = " ".join(tags)
        if tag_str:
            queries.append(f"{keyword} {tag_str} live")
        # Add channel-specific queries
        for ch in channels[:3]:
            queries.append(f"{ch} live stream")

        seen_urls: set[str] = set()
        for q in queries[:4]:  # cap total queries
            response = router.search(q, max_results=5, trigger_reason="live_discovery")
            for r in response.results:
                url = r.url
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                extracted = _extract_stream_from_result(url, r.title)
                candidates.extend(extracted)

        conn.close()
    except Exception:
        logger.debug("SearXNG stream search failed", exc_info=True)
    return candidates


# ── Main discovery pipeline ──

def _dedupe_candidates(candidates: list[dict]) -> list[dict]:
    """Dedupe candidates by canonicalized URL."""
    seen: set[str] = set()
    result: list[dict] = []
    for c in candidates:
        key = _dedupe_url_key(c.get("url", ""))
        if key not in seen:
            seen.add(key)
            result.append(c)
    return result


def _rank_live_candidates(candidates: list[dict], keyword: str, tags: list[str]) -> list[dict]:
    """Normalize → dedupe → validate → score → sort."""
    # Dedupe
    deduped = _dedupe_candidates(candidates)

    # Validate m3u8 sources
    validated = []
    for c in deduped:
        if c.get("sourceKind") == "m3u8" or c.get("type") == "hls":
            result = validate_m3u8_source(c)
            if result:
                # Preserve provenance fields
                for key in ("source", "confidence", "matched_channel", "extractor"):
                    if key in c:
                        result.setdefault(key, c[key])
                validated.append(result)
        elif c.get("type") == "iframe":
            # iframe candidates don't need m3u8 validation
            validated.append(c)

    if not validated:
        return []

    # Score
    for c in validated:
        source_prior = _SOURCE_PRIOR.get(c.get("source", ""), 0.3)
        validation_bonus = 0.0
        if c.get("stability") == "stable":
            validation_bonus = 0.15
        elif c.get("stability") == "volatile":
            validation_bonus = 0.05

        channel_bonus = 0.1 if c.get("matched_channel") else 0.0
        extractor_bonus = 0.1 if c.get("extractor") == "yt-dlp" else 0.0

        # Quality bonus
        h = c.get("height") or 0
        quality_bonus = 0.0
        if h >= 1080:
            quality_bonus = 0.08
        elif h >= 720:
            quality_bonus = 0.04

        # Blacklist penalty
        haystack = f"{c.get('label', '')} {c.get('url', '')}".lower()
        penalty = 0.5 if _BLACKLIST_RE.search(haystack) else 0.0

        c["score"] = round(source_prior + validation_bonus + channel_bonus + extractor_bonus + quality_bonus - penalty, 3)

    validated.sort(key=lambda c: c.get("score", 0), reverse=True)
    return validated


def discover_live_sources(rule: dict) -> list[dict]:
    """Discover live m3u8 sources via staged pipeline.

    Pipeline: keyword → channel discovery → IPTV channel-alias + SearXNG internet
    → normalize → dedupe → validate → score → rank → top 3.

    Args:
        rule: {keyword, tags?, quality?, discoveryProviders?, liveKind?}

    Returns:
        List of validated, scored VideoSource dicts (top 3).
    """
    keyword = (rule.get("keyword") or "").strip()
    tags = rule.get("tags") or []
    providers = rule.get("discoveryProviders", ["iptv_list", "tavily", "ai", "web", "github"])

    if not keyword:
        return []

    # Step 1: event → broadcast channel entities
    channels = _discover_channels(keyword, tags)
    logger.info("Channel discovery for '%s': %s", keyword, channels)

    # Steps 2A + 2B: collect candidates
    all_candidates: list[dict] = []

    # 2A: IPTV by channel names (priority), falls back to keyword
    all_candidates.extend(_fetch_iptv_lists(channels, keyword, tags))

    # 2B: Internet streams via SearXNG + yt-dlp
    all_candidates.extend(_search_searxng_streams(keyword, tags, channels))

    # Bonus providers (low-confidence supplements)
    if "ai" in providers:
        all_candidates.extend(_ai_suggest_sources(keyword, tags))
    if "tavily" in providers:
        all_candidates.extend(_search_tavily(keyword, tags))
    if "web" in providers:
        all_candidates.extend(_search_web(keyword, tags))
    if "github" in providers:
        all_candidates.extend(_search_github(keyword))

    if not all_candidates:
        return []

    # Normalize → dedupe → validate → score → rank
    ranked = _rank_live_candidates(all_candidates, keyword, tags)

    # Build final sources
    results = []
    for c in ranked[:3]:
        h = c.get("height") or 0
        res_label = f"{h}p" if h else ""
        label = c.get("label") or f"{keyword} (Live{' ' + res_label if res_label else ''})"
        results.append({
            "url": c["url"],
            "label": label,
            "type": c.get("type", "hls"),
            "originalUrl": c.get("originalUrl") or c.get("discoveryUrl", ""),
            "discoveryUrl": c.get("discoveryUrl", ""),
            "sourceKind": c.get("sourceKind", "m3u8"),
            "origin": "follow",
            "followMode": "live",
            "health": "ok",
            "stability": c.get("stability", "unknown"),
            "width": c.get("width"),
            "height": c.get("height"),
            "bandwidth": c.get("bandwidth"),
            "fps": c.get("fps"),
            "score": c.get("score", 0),
            "scoreReason": c.get("scoreReason", []),
            "confidence": c.get("confidence", 0),
            "matchedChannel": c.get("matched_channel", ""),
        })

    return results
