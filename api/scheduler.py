"""Background pipeline scheduler — embedded in the API process."""

import hashlib
import json
import os
import sys
import logging
from datetime import date, datetime, timedelta
from pathlib import Path

# Ensure pipeline/ is on sys.path (same trick api.py uses)
_pipeline_dir = str(Path(__file__).parent.parent / "pipeline")
if _pipeline_dir not in sys.path:
    sys.path.insert(0, _pipeline_dir)

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger("argus.scheduler")

_scheduler: BackgroundScheduler | None = None
_db_path: str = ""


def _run_pipeline_job():
    """Wrapper that calls run_pipeline with error isolation."""
    import time
    logger.info("Pipeline job starting...")
    t0 = time.monotonic()
    try:
        from pipeline.pipeline import run_pipeline
        run_pipeline(_db_path)
        elapsed = time.monotonic() - t0
        logger.info("Pipeline job completed in %.1fs", elapsed)
    except Exception as e:
        elapsed = time.monotonic() - t0
        logger.exception("Pipeline job failed after %.1fs", elapsed)
        try:
            from db import get_db
            from health import write_health, write_notification
            conn = get_db(_db_path)
            write_health(conn, "pipeline", "failed", str(e)[:500])
            write_notification(conn, "pipeline_failed", "Pipeline 异常终止", str(e)[:500])
            conn.close()
        except Exception:
            logger.exception("Failed to record pipeline failure")


def _refresh_countdown_dates():
    """Daily job: refresh countdown widget dates from AI keywords."""
    try:
        import urllib.request
        from db import get_db, get_setting

        conn = get_db(_db_path)
        row = conn.execute("SELECT doc FROM dashboard WHERE id = 'default'").fetchone()
        conn.close()
        if not row:
            return

        doc = json.loads(row["doc"])
        widgets = doc.get("widgets", [])

        # Collect unique keywords from countdown widgets
        keyword_set: set[str] = set()
        for w in widgets:
            if w.get("type") != "countdown":
                continue
            targets = w.get("config", {}).get("targets", [])
            for t in targets:
                kw = t.get("keyword", "").strip()
                if kw:
                    keyword_set.add(kw)

        if not keyword_set:
            logger.info("Countdown refresh: no keywords found, skipping")
            return

        keywords = sorted(keyword_set)
        logger.info("Countdown refresh: querying %d keywords: %s", len(keywords), keywords)

        # Call the batch refresh endpoint internally
        base_url = os.environ.get("ARGUS_API_URL", "http://127.0.0.1:8000")
        req = urllib.request.Request(
            f"{base_url}/ai/refresh-dates",
            data=json.dumps({"keywords": keywords}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())

        if not result.get("ok"):
            logger.warning("Countdown refresh failed: %s", result.get("error"))
            return

        date_results = result.get("results", {})
        today = date.today().isoformat()

        # Merge new dates into countdown widgets
        changed = False
        for w in widgets:
            if w.get("type") != "countdown":
                continue
            targets = w.get("config", {}).get("targets", [])
            if not targets:
                continue

            # Collect keywords used by this widget's targets
            widget_keywords = {t["keyword"] for t in targets if t.get("keyword", "").strip()}
            if not widget_keywords:
                continue

            # Build dedup set from existing targets
            existing_keys = set()
            for t in targets:
                dk = t.get("date", t.get("target", ""))
                dl = t.get("title", t.get("label", ""))
                existing_keys.add(f"{dk}|{dl}")

            # Append new dates from AI results
            for kw in widget_keywords:
                for d in date_results.get(kw, []):
                    ddate = d.get("date", "")
                    dlabel = d.get("label", "")
                    if ddate < today:
                        continue
                    dedup_key = f"{ddate}|{dlabel}"
                    if dedup_key in existing_keys:
                        continue
                    new_id = hashlib.sha256(dedup_key.encode()).hexdigest()[:12]
                    targets.append({
                        "id": f"auto-{new_id}",
                        "title": dlabel,
                        "target": ddate,
                        "source": "ai",
                        "keyword": kw,
                    })
                    existing_keys.add(dedup_key)
                    changed = True
                    logger.info("  Added: %s — %s", ddate, dlabel)

            w["config"]["targets"] = targets

        if changed:
            conn = get_db(_db_path)
            now = datetime.now().isoformat()
            doc_json = json.dumps(doc, ensure_ascii=False)
            conn.execute(
                "INSERT INTO dashboard (id, doc, updated_at) VALUES ('default', ?, ?) "
                "ON CONFLICT(id) DO UPDATE SET doc=excluded.doc, updated_at=excluded.updated_at",
                (doc_json, now),
            )
            conn.commit()
            conn.close()
            logger.info("Countdown refresh: saved updated dates")
        else:
            logger.info("Countdown refresh: no new dates found")

    except Exception:
        logger.exception("Countdown refresh failed")


def _check_embed_sources_health():
    """Periodic job: validate embed widget sources, re-parse expired ones."""
    import json
    from datetime import datetime, timezone

    try:
        from db import get_db
        from services.video_sources import validate_video_source

        conn = get_db(_db_path)
        row = conn.execute("SELECT doc, updated_at FROM dashboard WHERE id = 'default'").fetchone()
        if not row:
            conn.close()
            return

        doc = json.loads(row["doc"])
        old_updated_at = row["updated_at"]
        widgets = doc.get("widgets", [])
        changed = False

        for w in widgets:
            if w.get("type") != "embed":
                continue
            sources = w.get("config", {}).get("sources", [])
            if not sources:
                continue

            new_sources = []
            widget_changed = False
            for s in sources:
                # Only check sources with originalUrl
                if not s.get("originalUrl"):
                    new_sources.append(s)
                    continue

                result = validate_video_source(s)
                if result["status"] == "ok":
                    new_sources.append(result["source"])
                elif result["status"] == "replaced":
                    # Insert replacements at old source position, inherit origin
                    replacements = result["replacements"]
                    new_sources.extend(replacements)
                    widget_changed = True
                    logger.info("  Replaced source: %s → %d new sources",
                                s.get("url", "")[:60], len(replacements))
                else:  # dead
                    new_sources.append(result["source"])
                    widget_changed = True
                    logger.info("  Dead source: %s (%s)", s.get("url", "")[:60],
                                result.get("reason", "unknown"))

            if widget_changed:
                w["config"]["sources"] = new_sources
                changed = True

        if changed:
            # Optimistic concurrency: only write if dashboard hasn't been edited
            now = datetime.now(timezone.utc).isoformat()
            doc_json = json.dumps(doc, ensure_ascii=False)
            cursor = conn.execute(
                "UPDATE dashboard SET doc = ?, updated_at = ? "
                "WHERE id = 'default' AND updated_at = ?",
                (doc_json, now, old_updated_at),
            )
            if cursor.rowcount == 0:
                logger.info("Health check: concurrency_skip — dashboard was edited during check")
            else:
                conn.commit()
                logger.info("Health check: saved updated sources")
        else:
            logger.info("Health check: all sources healthy")

        conn.close()
    except Exception:
        logger.exception("Embed source health check failed")


def _refresh_follow_sources():
    """Periodic job: refresh follow-mode sources for embed widgets."""
    import json
    from datetime import datetime, timezone

    try:
        from db import get_db
        from services.video_sources import search_videos_for_topic, search_videos_for_creator

        conn = get_db(_db_path)
        row = conn.execute("SELECT doc, updated_at FROM dashboard WHERE id = 'default'").fetchone()
        if not row:
            conn.close()
            return

        doc = json.loads(row["doc"])
        old_updated_at = row["updated_at"]
        widgets = doc.get("widgets", [])
        changed = False

        for w in widgets:
            if w.get("type") != "embed":
                continue
            follow_rule = w.get("config", {}).get("followRule")
            if not follow_rule or follow_rule.get("mode") == "manual":
                continue

            mode = follow_rule["mode"]
            sources = w.get("config", {}).get("sources", [])
            manual = [s for s in sources if s.get("origin") != "follow"]
            old_follow = [s for s in sources if s.get("origin") == "follow"]
            current = old_follow[0] if old_follow else None

            try:
                results = []

                if mode == "live":
                    if current and current.get("health") == "ok":
                        continue
                    results = search_videos_for_topic({
                        "keyword": follow_rule.get("keyword", ""),
                        "selectedTags": follow_rule.get("tags", []),
                        "contentType": "live",
                        "followMode": "live",
                    })
                    results = results[:3]

                elif mode == "creator":
                    if not follow_rule.get("channelUrl") and not follow_rule.get("channelId"):
                        continue
                    results = search_videos_for_creator(follow_rule)
                    # Only replace if newer
                    if current and current.get("health") == "ok":
                        current_pub = current.get("publishedAt")
                        if current_pub:
                            newer = [r for r in results if r.get("publishedAt") and r["publishedAt"] > current_pub]
                            results = newer[:1]
                        else:
                            results = []
                    else:
                        results = results[:1]

                elif mode == "topic":
                    if current and current.get("health") == "ok":
                        continue
                    results = search_videos_for_topic({
                        "keyword": follow_rule.get("keyword", ""),
                        "selectedTags": follow_rule.get("tags", []),
                        "contentType": "video",
                        "followMode": "topic",
                    })
                    results = results[:3]

                if results:
                    for s in results:
                        s["origin"] = "follow"
                        s["followMode"] = mode
                    w["config"]["sources"] = manual + results
                    changed = True
                    logger.info("  Follow [%s] '%s': %d sources", mode, follow_rule.get("keyword", ""), len(results))
                else:
                    for s in old_follow:
                        s["health"] = "stale"

            except Exception as e:
                logger.warning("  Follow [%s] refresh failed: %s", mode, e)
                for s in old_follow:
                    s["health"] = "stale"

        if changed:
            now = datetime.now(timezone.utc).isoformat()
            doc_json = json.dumps(doc, ensure_ascii=False)
            cursor = conn.execute(
                "UPDATE dashboard SET doc = ?, updated_at = ? "
                "WHERE id = 'default' AND updated_at = ?",
                (doc_json, now, old_updated_at),
            )
            if cursor.rowcount == 0:
                logger.info("Follow refresh: concurrency_skip — dashboard was edited during refresh")
            else:
                conn.commit()
                logger.info("Follow refresh: saved updated sources")
        else:
            logger.info("Follow refresh: no changes")

        conn.close()
    except Exception:
        logger.exception("Follow source refresh failed")


def start_scheduler():
    """Called from FastAPI lifespan. Runs pipeline once, then schedules."""
    global _scheduler, _db_path

    _db_path = os.environ.get("ARGUS_DB_PATH", "data/argus.db")

    from db import get_db, get_setting
    conn = get_db(_db_path)
    minutes = int(get_setting(conn, "refresh_min", "60"))
    conn.close()

    _scheduler = BackgroundScheduler(
        job_defaults={
            "max_instances": 1,
            "coalesce": True,
            "misfire_grace_time": 300,
        },
    )

    # Schedule recurring pipeline
    _scheduler.add_job(
        _run_pipeline_job,
        trigger=IntervalTrigger(minutes=max(minutes, 5)),
        id="pipeline",
        replace_existing=True,
        next_run_time=datetime.now() + timedelta(seconds=10),  # first run 10s after startup
    )

    # Schedule daily countdown date refresh at 06:30
    _scheduler.add_job(
        _refresh_countdown_dates,
        trigger=CronTrigger(hour=6, minute=30),
        id="countdown_refresh",
        replace_existing=True,
    )

    # Schedule embed source health check every 4 hours
    _scheduler.add_job(
        _check_embed_sources_health,
        trigger=IntervalTrigger(hours=4),
        id="embed_health",
        replace_existing=True,
    )

    # Schedule follow source refresh every 4 hours
    _scheduler.add_job(
        _refresh_follow_sources,
        trigger=IntervalTrigger(hours=4),
        id="follow_refresh",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("Pipeline scheduler started (interval=%d min, countdown 06:30, health 4h, follow 4h)", max(minutes, 5))


def reschedule(minutes: int):
    """Reschedule pipeline job when refresh_min changes."""
    if _scheduler is None:
        return
    minutes = max(minutes, 5)
    _scheduler.reschedule_job(
        "pipeline",
        trigger=IntervalTrigger(minutes=minutes),
    )
    logger.info("Pipeline rescheduled to %d min", minutes)


def trigger_now():
    """Trigger an immediate pipeline run (non-blocking)."""
    if _scheduler is None:
        raise RuntimeError("Scheduler not started")
    _scheduler.add_job(
        _run_pipeline_job,
        id="pipeline-manual",
        replace_existing=True,
        misfire_grace_time=60,
    )
    logger.info("Manual pipeline trigger queued")


def shutdown_scheduler():
    """Called on app shutdown."""
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
