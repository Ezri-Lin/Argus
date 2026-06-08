"""Argus v2 pipeline: RSS -> base model -> search -> Pro? -> events -> snapshot -> health.

Orchestrates the scan cycle.  Heavy logic lives in sub-modules.
"""

import json
import sys
import threading
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed


def _parse_terms(value):
    """Parse JSON string or return list as-is."""
    if isinstance(value, list):
        return value
    if not value:
        return []
    try:
        return json.loads(value)
    except Exception:
        return []


def _build_domain_query(member_name: str, domain_key: str, conn) -> str:
    """Build domain-aware search query for a member."""
    if not domain_key:
        return member_name
    row = conn.execute(
        "SELECT key, label_en, search_intent, include_terms FROM domains WHERE key = ?",
        (domain_key,),
    ).fetchone()
    if not row:
        return member_name
    terms = _parse_terms(row["include_terms"])[:3]
    intent = row["search_intent"] or row["label_en"] or row["key"]
    if terms:
        return f"{member_name} {' '.join(terms)}"
    return f"{member_name} {intent}"
from pathlib import Path

import feedparser
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))

from article_lifecycle import ArticleLifecycle, ARCHIVE_MAX_DAYS
from db import get_db, get_model_for_role, get_setting, init_db
from helpers import fingerprint, now_iso, safe_text
from local_search import LocalArticleSearch
from matching import member_domains, member_aliases
from models import call_model
from processing import filter_and_deduplicate, process_member_items, get_local_candidates
from relevance import ArticleRelevanceEngine
from rss import fetch_rss_items
from scheduling import load_due_members, update_scan_schedule
from snapshot import build_snapshot
from health import _update_member_status, _update_progress, _pipeline_progress, write_health
from search import SearchRouter
from search.policy import PolicyConfig, ProValidationConfig

load_dotenv(Path(__file__).parent.parent / ".env")

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


# ── Main pipeline ──

def run_pipeline(db_path: str | None = None):
    conn = init_db(db_path)
    now = now_iso()
    _update_progress(running=True, step="rss", started_at=now, members_done=0, events_found=0)

    # Read config
    deep_search_enabled = get_setting(conn, "deep_search_enabled", "false") == "true"
    pro_enabled = get_setting(conn, "pro_enabled", "false") == "true"
    language = get_setting(conn, "language", "zh")

    LANG_INSTRUCTION = {
        "zh": "所有输出文字（short_label, note, reason, impactRationale）必须用中文。",
        "en": "All text output (short_label, note, reason, impactRationale) must be in English.",
    }
    lang_instruction = LANG_INSTRUCTION.get(language, LANG_INSTRUCTION["zh"])

    # Read models
    base_model = get_model_for_role(conn, "base")
    if not base_model:
        print("ERROR: No base model configured. Run seed.py first.")
        write_health(conn, "pipeline", "failed", "No base model")
        conn.commit()
        _update_progress(running=False, step="idle")
        conn.close()
        return

    pro_model = get_model_for_role(conn, "pro") if pro_enabled else None

    # Read members (due active memberships) + sources
    members = load_due_members(conn)
    sources = conn.execute("SELECT * FROM sources").fetchall()

    if not members:
        print("ERROR: No members configured. Run seed.py first.")
        write_health(conn, "pipeline", "failed", "No members")
        conn.commit()
        _update_progress(running=False, step="idle")
        conn.close()
        return

    fetch_before_process = get_setting(conn, "fetch_before_process", "true") == "true"

    print(f"Pipeline: {len(members)} members due, {len(sources)} sources")
    print(f"  base_model: {base_model['label']} ({base_model['model']})")
    print(f"  deep_search: {'on' if deep_search_enabled else 'off'}, pro: {'on' if pro_enabled else 'off'}")

    # RSS fetch (can be disabled if fetch.py runs as separate cron)
    all_items: list[dict] = []
    rss_errors: list[tuple[str, str]] = []
    if fetch_before_process:
        _update_progress(rss_sources_total=len(sources), rss_sources_done=0)

        def _rss_progress(done: int, total: int):
            _update_progress(rss_sources_done=done)

        all_items, rss_errors = fetch_rss_items(sources, conn, feedparser.parse, _rss_progress)
        _update_progress(rss_sources_done=len(sources))
        for src_name, err_msg in rss_errors:
            write_health(conn, "rss", "degraded", err_msg)
        if not rss_errors:
            write_health(conn, "rss", "ok")
        print(f"  Fetched {len(all_items)} RSS items ({len(rss_errors)} errors)")
    else:
        print("  RSS fetch: skipped (fetch_before_process=false, use fetch.py separately)")

    # ── Local-first: lifecycle cleanup ──
    lifecycle = ArticleLifecycle(conn)
    discarded = lifecycle.auto_discard_stale()
    archived = lifecycle.archive_stale()
    if discarded or archived:
        print(f"  Lifecycle: discarded {len(discarded)}, archived {len(archived)} stale articles")

    # ── Discovery search per member ──
    ai_search_enabled = get_setting(conn, "ai_search_enabled", "true") == "true"
    ai_search_max = int(get_setting(conn, "ai_search_max_results", "5"))

    if ai_search_enabled:
        _update_progress(step="searching", search_done=0, search_total=len(members))
        print(f"  Discovery search: enabled (max {ai_search_max} results/member)")
        discovery_router = SearchRouter(conn, profile="discovery")
        for member in members:
            mb = dict(member)
            domain_key = mb.get("domain_key", "")
            query = _build_domain_query(mb["name"], domain_key, conn)
            try:
                response = discovery_router.discovery(
                    query, max_results=ai_search_max, member_id=str(mb["id"]),
                )
                for sr in response.results:
                    all_items.append({
                        "title": sr.title,
                        "url": sr.url,
                        "published": sr.published or "",
                        "snippet": sr.snippet,
                        "source_name": sr.outlet or "Web Search",
                        "source_id": 0,
                        "source_logo": "",
                        "_source": "discovery",
                    })
                print(f"    {mb['name']}: {len(response.results)} discovery results")
            except Exception as e:
                print(f"    {mb['name']} discovery error: {safe_text(e)}")
            _update_progress(search_done=_pipeline_progress["search_done"] + 1)
    else:
        print("  Discovery search: disabled")

    total_kept = 0
    total_dropped = 0

    # ── Phase 1: Local-first matching per member ──
    # Primary: search local rss_articles (FTS5 + relevance scoring)
    # Fallback: match against RSS items from this fetch run
    work_queue: list[tuple[int, dict, list, str, str]] = []
    members_progress: list[dict] = []
    for member_idx, member in enumerate(members):
        mb = dict(member)
        domains_list = member_domains(conn, mb["id"])
        domain_str = ", ".join(domains_list) if domains_list else ""
        aliases = member_aliases(mb)
        aliases_str = ", ".join(aliases)

        members_progress.append({
            "name": mb["name"],
            "domain": domain_str,
            "status": "pending",
            "events": 0,
            "log": "",
        })

        # PRIMARY: local article search (FTS5 + relevance)
        local_items = get_local_candidates(conn, mb, aliases)
        new_items = []
        for item in local_items:
            fp = fingerprint(item["url"], item["title"])
            exists = conn.execute(
                "SELECT id FROM events WHERE fingerprint = ?", (fp,)
            ).fetchone()
            if not exists:
                new_items.append(item)

        # FALLBACK: match against RSS items from this fetch run
        if not new_items:
            result = filter_and_deduplicate(member, all_items, conn)
            if result is not None:
                mb, new_items, aliases_str, domain_str = result

        if not new_items:
            members_progress[-1]["status"] = "done"
            members_progress[-1]["log"] = "0 matching items"
            continue

        work_queue.append((member_idx, mb, new_items[:10], aliases_str, domain_str))

    _update_progress(step="analyzing", members_total=len(members), members_done=0, members=members_progress)

    # ── Phase 2: Concurrent AI processing ──
    all_events: list[dict] = []
    search_policy = PolicyConfig.from_settings(conn)
    pro_validation_config = ProValidationConfig.from_settings(conn)

    # Deep search budget (thread-safe counter)
    deep_search_cap = int(get_setting(conn, "deep_search_daily_cap", "30"))
    deep_search_count = [0]
    deep_search_lock = threading.Lock()

    def _make_router():
        return SearchRouter(get_db(db_path), profile="deep")

    def _get_deep_budget():
        with deep_search_lock:
            return max(0, deep_search_cap - deep_search_count[0])

    def _consume_deep_budget():
        with deep_search_lock:
            deep_search_count[0] += 1

    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {
            pool.submit(
                process_member_items, idx, mb, items, aliases, domains,
                base_model, pro_model, pro_enabled, deep_search_enabled,
                lang_instruction, search_policy, pro_validation_config,
                _get_deep_budget, _consume_deep_budget, _update_member_status,
                _make_router, call_model,
            ): idx
            for idx, mb, items, aliases, domains in work_queue
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                events = future.result()
                all_events.extend(events)
                mb = next((m for i, m, *_ in work_queue if i == idx), None)
                if mb:
                    update_scan_schedule(conn, mb.get("domain_key", ""), mb["id"])
                _update_member_status(idx, "done", events=len(events), log=f"{len(events)} events")
                _update_progress(events_found=_pipeline_progress["events_found"] + len(events))
            except Exception as e:
                _update_member_status(idx, "failed", log=safe_text(e, 80))
                print(f"  Member failed: {e}")

    # ── Phase 3: Batch flush all events to SQLite (main thread) ──
    for ev in all_events:
        conn.execute(
            "INSERT INTO events (fingerprint, member_id, title, url, outlet, published, "
            "sentiment, importance, impact_weight, impact_persistence_days, "
            "impact_confidence, impact_rationale, kind, event_type, status, note, rumor, sources, need_pro, "
            "route_reason, first_seen, last_seen) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(fingerprint) DO UPDATE SET "
            "sentiment=excluded.sentiment, importance=excluded.importance, "
            "impact_weight=excluded.impact_weight, "
            "impact_persistence_days=excluded.impact_persistence_days, "
            "impact_confidence=excluded.impact_confidence, "
            "impact_rationale=excluded.impact_rationale, "
            "kind=excluded.kind, event_type=excluded.event_type, status=excluded.status, note=excluded.note, "
            "sources=excluded.sources, rumor=excluded.rumor, "
            "route_reason=excluded.route_reason, "
            "last_seen=excluded.last_seen",
            (
                ev["fingerprint"], ev["member_id"], ev["title"], ev["url"], ev["outlet"],
                ev["published"], ev["sentiment"], ev["importance"], ev["impact_weight"],
                ev["impact_persistence_days"], ev["impact_confidence"], ev["impact_rationale"],
                ev["kind"], ev["event_type"], ev["status"], ev["note"], ev["rumor"], ev["sources"],
                ev["need_pro"], ev["route_reason"], now, now,
            ),
        )
        total_kept += 1
    conn.commit()
    print(f"\n  Flushed {total_kept} events to DB")

    # Write consolidated health
    write_health(conn, "base_model", "ok")
    if pro_model:
        write_health(conn, "pro_model", "ok")
    for row in conn.execute("SELECT name FROM search_providers WHERE enabled = 1").fetchall():
        write_health(conn, f"search_{row['name']}", "ok")
    write_health(conn, "pipeline", "ok")

    # Build snapshot (read previous for sentiment history)
    _update_progress(step="snapshot")
    try:
        prev_sentiment_map: dict[str, float] = {}
        try:
            row = conn.execute("SELECT doc FROM snapshot WHERE id = 'latest'").fetchone()
            if row:
                old = json.loads(row["doc"])
                for group in old.get("children", []):
                    for m in group.get("children", []):
                        if m.get("name") and m.get("sentiment") is not None:
                            prev_sentiment_map[m["name"]] = m["sentiment"]
        except Exception:
            pass
        snapshot = build_snapshot(conn, prev_sentiment_map)
        conn.execute(
            "INSERT INTO snapshot (id, doc, generated) VALUES ('latest', ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET doc=excluded.doc, generated=excluded.generated",
            (json.dumps(snapshot, ensure_ascii=False), now),
        )
        write_health(conn, "pipeline", "ok")
    except Exception as e:
        print(f"Snapshot error: {safe_text(e)}")
        write_health(conn, "pipeline", "failed", safe_text(e))
        traceback.print_exc()

    conn.commit()
    _update_progress(running=False, step="idle", current_member="", current_domain="")
    print(f"\nDone. Kept: {total_kept}, Dropped: {total_dropped}")
    conn.close()


if __name__ == "__main__":
    run_pipeline()
