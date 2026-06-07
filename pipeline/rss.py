"""RSS feed fetching and parsing."""

from helpers import safe_text


def fetch_rss_items(sources, conn, parse_fn, progress_callback=None) -> tuple[list[dict], list[tuple[str, str]]]:
    """Fetch RSS items from all sources.

    Args:
        sources: iterable of source rows (dict-like).
        conn: database connection for updating source logos.
        parse_fn: feedparser.parse (passed in so callers can monkey-patch).
        progress_callback: optional callable(sources_done, sources_total) for incremental progress.

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
            feed = parse_fn(src["url"])
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
            for entry in feed.entries[:30]:
                all_items.append({
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "snippet": entry.get("summary", "")[:300],
                    "source_name": src["name"],
                    "source_id": src["id"],
                    "source_logo": src.get("logo_url", ""),
                })
        except Exception as e:
            print(f"  RSS error ({safe_text(src['name'])}): {safe_text(e)}")
            errors.append((src["name"], safe_text(e)))
        if progress_callback:
            progress_callback(i + 1, total)
    return all_items, errors
