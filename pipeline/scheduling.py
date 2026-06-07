"""Membership-based scan scheduling: due-member lookup and scan-time updates."""

from datetime import datetime, timedelta, timezone

from helpers import now_iso

TIER_REFRESH_DEFAULTS = {
    "primary": 120,    # minutes
    "secondary": 360,
}
TIER_PRIORITY = {"primary": 2, "secondary": 1, "ai_candidate": 0}


def load_due_members(conn) -> list[dict]:
    """Load distinct members that have at least one due active membership.

    Returns list of dicts: {id, name, ..., effective_tier, membership_domains}.
    Falls back to all members if no memberships exist.
    """
    now = now_iso()
    count = conn.execute("SELECT COUNT(*) FROM memberships").fetchone()[0]
    if count == 0:
        rows = conn.execute("SELECT * FROM members").fetchall()
        return [dict(r) | {"effective_tier": "primary", "membership_domains": []} for r in rows]

    due = conn.execute("""
        SELECT m.*, mb.domain, mb.tier, mb.refresh_interval_minutes
        FROM memberships mb
        JOIN members m ON m.id = mb.member_id
        WHERE mb.enabled = 1
          AND mb.tier IN ('primary', 'secondary')
          AND (mb.next_scan_at IS NULL OR mb.next_scan_at <= ?)
    """, (now,)).fetchall()

    if not due:
        return []

    member_map: dict[int, dict] = {}
    for row in due:
        mid = row["id"]
        if mid not in member_map:
            member_map[mid] = {
                "member": dict(row),
                "tier": row["tier"],
                "domains": set(),
            }
        else:
            if TIER_PRIORITY.get(row["tier"], 0) > TIER_PRIORITY.get(member_map[mid]["tier"], 0):
                member_map[mid]["tier"] = row["tier"]
        member_map[mid]["domains"].add(row["domain"])

    result = []
    for mid, info in member_map.items():
        mb = info["member"]
        mb["effective_tier"] = info["tier"]
        mb["membership_domains"] = sorted(info["domains"])
        result.append(mb)

    return result


def update_scan_schedule(conn, member_id: int):
    """Update last_scanned_at / next_scan_at for all active memberships of a member."""
    now = now_iso()
    rows = conn.execute(
        "SELECT domain, tier, refresh_interval_minutes FROM memberships "
        "WHERE member_id = ? AND enabled = 1 AND tier IN ('primary', 'secondary')",
        (member_id,),
    ).fetchall()
    for row in rows:
        interval = row["refresh_interval_minutes"] or TIER_REFRESH_DEFAULTS.get(row["tier"], 360)
        next_dt = datetime.fromisoformat(now.replace("Z", "+00:00")) + timedelta(minutes=interval)
        next_at = next_dt.isoformat()
        conn.execute(
            "UPDATE memberships SET last_scanned_at = ?, next_scan_at = ? "
            "WHERE member_id = ? AND domain = ?",
            (now, next_at, member_id, row["domain"]),
        )
    conn.commit()
