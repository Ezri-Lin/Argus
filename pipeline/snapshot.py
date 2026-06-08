"""Snapshot builder: treemap data grouped by domain -> member."""

import json
from datetime import datetime, timezone

from helpers import clamp_float

# ── Constants ──

MIN_MEMBER_INFLUENCE = 10
DEFAULT_BASELINE_INFLUENCE = 20.0
NEWS_HALF_LIFE_DAYS = 3.0
DEFAULT_IMPACT_PERSISTENCE_DAYS = 7.0


# ── Time & impact decay ──

def time_decay(age_days: float) -> float:
    return 0.5 ** (age_days / NEWS_HALF_LIFE_DAYS)


def impact_decay(age_days: float, persistence_days: float) -> float:
    return 0.5 ** (age_days / max(persistence_days, 1.0))


def parse_dt(value: object) -> datetime | None:
    if not value:
        return None
    try:
        text = str(value).replace("Z", "+00:00")
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def age_days(value: object, now: datetime | None = None) -> float:
    dt = parse_dt(value)
    if not dt:
        return 0.0
    ref = now or datetime.now(timezone.utc)
    return max(0.0, (ref - dt).total_seconds() / 86400)


def default_impact_weight(importance: object) -> float:
    return clamp_float(importance, 0.0, 1.0, 0.0) * 100.0


def default_persistence_days(importance: object) -> float:
    imp = clamp_float(importance, 0.0, 1.0, 0.0)
    if imp >= 0.8:
        return 120.0
    if imp >= 0.5:
        return 30.0
    if imp >= 0.2:
        return DEFAULT_IMPACT_PERSISTENCE_DAYS
    return 1.0


def event_status_factor(status: object) -> float:
    if status == "refuted":
        return 0.0
    if status == "watch":
        return 0.65
    return 1.0


# ── Snapshot builder ──

def build_snapshot(conn, prev_sentiment_map: dict[str, float] | None = None) -> dict:
    """Build treemap snapshot grouped by domain -> member."""
    if prev_sentiment_map is None:
        prev_sentiment_map = {}
    domains = conn.execute("SELECT * FROM domains ORDER BY rowid").fetchall()
    now = datetime.now(timezone.utc)

    children = []
    for domain in domains:
        members = conn.execute(
            "SELECT mb.*, ms.role, ms.role_weight FROM memberships ms "
            "JOIN members mb ON mb.id = ms.member_id "
            "WHERE ms.domain = ? ORDER BY ms.role_weight DESC, mb.name",
            (domain["key"],),
        ).fetchall()

        member_children = []
        for member in members:
            baseline = clamp_float(
                member["baseline_influence"],
                0.0,
                100.0,
                DEFAULT_BASELINE_INFLUENCE,
            )
            role_weight = clamp_float(member["role_weight"], 0.0, 10.0, 1.0)
            events = conn.execute(
                "SELECT * FROM events WHERE member_id = ? "
                "ORDER BY COALESCE(last_seen, first_seen, published) DESC, importance DESC LIMIT 20",
                (member["id"],),
            ).fetchall()

            # Baseline is member existence/long-term stature. Events add slow-decaying influence.
            event_lift = 0.0
            weighted_sentiment = 0.0
            freshness = 0.0
            latest_headline = ""
            top_impact_weight = 0.0
            top_persistence_days = DEFAULT_IMPACT_PERSISTENCE_DAYS
            non_refuted_events = []

            for e in events:
                status_factor = event_status_factor(e["status"])
                if status_factor <= 0:
                    continue
                e_age = age_days(e["last_seen"] or e["published"], now)
                impact_weight = clamp_float(
                    e["impact_weight"],
                    0.0,
                    100.0,
                    default_impact_weight(e["importance"]),
                )
                persistence_days = clamp_float(
                    e["impact_persistence_days"],
                    1.0,
                    365.0,
                    default_persistence_days(e["importance"]),
                )
                contribution = impact_weight * impact_decay(e_age, persistence_days) * status_factor
                event_lift += contribution
                weighted_sentiment += (e["sentiment"] or 0) * contribution
                freshness = max(freshness, time_decay(e_age))
                non_refuted_events.append(e)
                if not latest_headline:
                    latest_headline = e["title"] or e["note"]
                if impact_weight > top_impact_weight:
                    top_impact_weight = impact_weight
                    top_persistence_days = persistence_days

            avg_sentiment = weighted_sentiment / event_lift if event_lift > 0 else 0
            influence = max(MIN_MEMBER_INFLUENCE, (baseline + event_lift) * role_weight)
            size = max(MIN_MEMBER_INFLUENCE, int(round(influence)))

            # Determine confidence status
            statuses = [e["status"] for e in non_refuted_events if e["status"]]
            if not statuses or all(s == "confirmed" for s in statuses):
                confidence = "confirmed"
            else:
                confidence = "watch"

            # Top related events for detail panel
            related = []
            for e in non_refuted_events[:5]:
                # Parse sources JSON from DB
                raw_sources = e["sources"] or "[]"
                try:
                    parsed_sources = json.loads(raw_sources) if isinstance(raw_sources, str) else raw_sources
                except (json.JSONDecodeError, TypeError):
                    parsed_sources = []
                related.append({
                    "title": e["title"],
                    "url": e["url"] or "",
                    "outlet": e["outlet"] or "",
                    "time": e["published"] or "",
                    "importance": e["importance"] or 0,
                    "impactWeight": (
                        e["impact_weight"]
                        if e["impact_weight"] is not None
                        else default_impact_weight(e["importance"])
                    ),
                    "impactPersistenceDays": (
                        e["impact_persistence_days"]
                        if e["impact_persistence_days"] is not None
                        else default_persistence_days(e["importance"])
                    ),
                    "kind": e["kind"] or "",
                    "note": e["note"] or "",
                    "sources": parsed_sources,
                })

            # Use the best short_label from events as metric
            best_note = ""
            for e in non_refuted_events:
                if e["note"] and len(e["note"]) <= 25:
                    best_note = e["note"]
                    break
            # Fallback: truncated headline
            if not best_note:
                best_note = latest_headline[:20] if latest_headline else "quiet"

            member_children.append({
                "name": member["name"],
                "size": size,
                "sentiment": round(avg_sentiment, 2),
                "previousSentiment": prev_sentiment_map.get(member["name"]),
                "headline": latest_headline,
                "metric": best_note or "quiet",
                "heat": min(freshness, 1.0),
                "freshness": round(min(freshness, 1.0), 4),
                "influence": round(influence, 2),
                "baselineInfluence": round(baseline, 2),
                "impactWeight": round(top_impact_weight, 2),
                "impactPersistenceDays": round(top_persistence_days, 2),
                "confidence": confidence,
                "status": confidence,
                "related": related,
            })

        if member_children:
            member_children.sort(key=lambda item: item["size"], reverse=True)
            children.append({
                "name": domain["label"] or domain["key"],
                "key": domain["key"],
                "weight": domain["weight"],
                "children": member_children,
            })

    return {
        "name": "watchlist",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "children": children,
    }
