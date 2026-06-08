"""Widget-member-registry-based scan scheduling: due-member lookup and scan-time updates.

HARD CONSTRAINT: Scan unit is (domain_key, member_id), NOT just member_id.
Same member in different domains is independent: different query context,
different refresh interval, different scan state.
"""

from datetime import datetime, timedelta, timezone

from helpers import now_iso

TIER_REFRESH_DEFAULTS = {
    "primary": 120,    # minutes
    "secondary": 360,
}
TIER_PRIORITY = {"primary": 2, "secondary": 1, "ai_candidate": 0}


def load_due_members(conn) -> list[dict]:
    """Load distinct (domain_key, member_id) scan units that are due.

    Returns list of dicts: {id, name, ..., effective_tier, domain_key, scan_interval_minutes}.
    Falls back to all members if no registry rows exist.
    """
    now = now_iso()
    count = conn.execute("SELECT COUNT(*) FROM widget_member_registry").fetchone()[0]
    if count == 0:
        # Legacy fallback: use memberships table
        count_mb = conn.execute("SELECT COUNT(*) FROM memberships").fetchone()[0]
        if count_mb == 0:
            rows = conn.execute("SELECT * FROM members").fetchall()
            return [dict(r) | {"effective_tier": "primary", "domain_key": ""} for r in rows]
        due = conn.execute("""
            SELECT m.*, mb.domain AS domain_key, mb.tier, mb.refresh_interval_minutes
            FROM memberships mb
            JOIN members m ON m.id = mb.member_id
            WHERE mb.enabled = 1
              AND mb.tier IN ('primary', 'secondary')
              AND (mb.next_scan_at IS NULL OR mb.next_scan_at <= ?)
        """, (now,)).fetchall()
        result = []
        for row in due:
            r = dict(row)
            r["effective_tier"] = r["tier"]
            r["scan_interval_minutes"] = r["refresh_interval_minutes"] or TIER_REFRESH_DEFAULTS.get(r["tier"], 360)
            result.append(r)
        return result

    # Query widget_member_registry grouped by (domain_key, member_id)
    # Use MIN(interval) across widgets — most aggressive interval wins
    due = conn.execute("""
        SELECT
            m.*,
            r.domain_key,
            r.tier,
            MIN(
                CASE
                    WHEN r.tier = 'primary' THEN r.primary_interval_minutes
                    WHEN r.tier = 'secondary' THEN r.secondary_interval_minutes
                    ELSE 360
                END
            ) AS scan_interval_minutes
        FROM widget_member_registry r
        JOIN members m ON m.id = r.member_id
        WHERE r.enabled = 1
          AND r.tier IN ('primary', 'secondary')
          AND (r.next_scan_at IS NULL OR r.next_scan_at <= ?)
        GROUP BY r.domain_key, r.member_id
    """, (now,)).fetchall()

    result = []
    for row in due:
        r = dict(row)
        r["effective_tier"] = r["tier"]
        result.append(r)

    return result


def update_scan_schedule(conn, domain_key: str, member_id: int):
    """Update last_scan_at / next_scan_at for all registry rows of (domain_key, member_id)."""
    now = now_iso()
    rows = conn.execute(
        "SELECT tier, primary_interval_minutes, secondary_interval_minutes "
        "FROM widget_member_registry "
        "WHERE domain_key = ? AND member_id = ? AND enabled = 1 AND tier IN ('primary', 'secondary')",
        (domain_key, member_id),
    ).fetchall()
    if not rows:
        return
    # Use the most aggressive interval
    min_interval = None
    for row in rows:
        interval = (
            row["primary_interval_minutes"] if row["tier"] == "primary"
            else row["secondary_interval_minutes"]
        )
        if min_interval is None or interval < min_interval:
            min_interval = interval
    interval = min_interval or TIER_REFRESH_DEFAULTS.get(rows[0]["tier"], 360)
    next_dt = datetime.fromisoformat(now.replace("Z", "+00:00")) + timedelta(minutes=interval)
    next_at = next_dt.isoformat()
    conn.execute(
        "UPDATE widget_member_registry SET last_scan_at = ?, next_scan_at = ? "
        "WHERE domain_key = ? AND member_id = ? AND enabled = 1",
        (now, next_at, domain_key, member_id),
    )
    conn.commit()
