"""RSS feed fetching and parsing."""

import hashlib

import requests

try:
    from pipeline.helpers import now_iso, safe_text
except ImportError:
    from helpers import now_iso, safe_text

_UA = "Mozilla/5.0 (compatible; ArgusFeed/1.0; +https://github.com/argus)"


def _article_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def fetch_rss_items(sources, conn, parse_fn, progress_callback=None) -> tuple[list[dict], list[tuple[str, str]]]:
    """Fetch RSS items from all sources and persist to rss_articles.

    Args:
        sources: iterable of source rows (dict-like).
        conn: database connection for writing articles and updating source health.
        parse_fn: feedparser.parse (passed in so callers can monkey-patch).
        progress_callback: optional callable(sources_done, sources_total).

    Returns:
        Tuple of (items, errors) where items is a list of dicts ready for
        downstream processing and errors is a list of (source_name, error_msg).
    """
    all_items: list[dict] = []
    errors: list[tuple[str, str]] = []
    source_list = list(sources)
    total = len(source_list)
    for i, source in enumerate(source_list):
        src = dict(source)
        try:
            resp = requests.get(src["url"], timeout=15, headers={"User-Agent": _UA})
            resp.raise_for_status()
            feed = parse_fn(resp.content)
            # Extract feed logo if we don't have one yet
            if not src.get("logo_url"):
                try:
                    feed_meta = feed.feed
                    logo = (
                        (feed_meta.get("image") or {}).get("href")
                        or feed_meta.get("icon")
                        or feed_meta.get("logo")
                    )
                    if logo:
                        conn.execute("UPDATE sources SET logo_url = ? WHERE id = ?", (logo, src["id"]))
                        src["logo_url"] = logo
                except AttributeError:
                    pass
            fetched_at = now_iso()
            for entry in feed.entries[:30]:
                title = entry.get("title", "")
                url = entry.get("link", "")
                snippet = entry.get("summary", "")[:300]
                published = entry.get("published", "")
                article_id = _article_id(url)
                conn.execute(
                    """INSERT OR IGNORE INTO rss_articles
                       (id, source_id, url, title, snippet, published_at, fetched_at, lifecycle_status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'fresh')""",
                    (article_id, src["id"], url, title, snippet, published, fetched_at),
                )
                all_items.append({
                    "title": title,
                    "url": url,
                    "published": published,
                    "snippet": snippet,
                    "source_name": src["name"],
                    "source_id": src["id"],
                    "source_logo": src.get("logo_url", ""),
                })
            # Update source health on success
            conn.execute(
                """UPDATE sources
                   SET last_fetched_at = ?, last_success_at = ?,
                       health_status = 'healthy', consecutive_failures = 0
                   WHERE id = ?""",
                (fetched_at, fetched_at, src["id"]),
            )
            conn.commit()
        except Exception as e:
            err_msg = safe_text(e)
            print(f"  RSS error ({safe_text(src['name'])}): {err_msg}")
            errors.append((src["name"], err_msg))
            # Update source health on failure
            fetched_at = now_iso()
            row = conn.execute(
                "SELECT consecutive_failures FROM sources WHERE id = ?",
                (src["id"],),
            ).fetchone()
            failures = (row["consecutive_failures"] if row else 0) + 1
            health = "failing" if failures >= 3 else "degraded"
            conn.execute(
                """UPDATE sources
                   SET last_fetched_at = ?, last_error = ?,
                       consecutive_failures = ?, health_status = ?
                   WHERE id = ?""",
                (fetched_at, err_msg, failures, health, src["id"]),
            )
            conn.commit()
        if progress_callback:
            progress_callback(i + 1, total)
    return all_items, errors
