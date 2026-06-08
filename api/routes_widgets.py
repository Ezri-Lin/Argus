"""Widget-member registry CRUD — new SoT for widget-domain-member relationships."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db

router = APIRouter(tags=["widgets"])


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


# ── Models ──

class WidgetMemberIn(BaseModel):
    member_id: int
    tier: Literal["primary", "secondary", "ai_candidate"] = "secondary"
    enabled: bool = True
    display_order: int | None = None


class WidgetConfigSave(BaseModel):
    group: str  # domain key
    members: list[WidgetMemberIn]
    primary_interval_minutes: int = 90
    secondary_interval_minutes: int = 90


# ── Helpers ──

def _enqueue_hydration(conn, widget_id: str, domain_key: str, member_ids: list[int]):
    """Mark new members for hydration — pipeline will pick them up on next cycle."""
    now = datetime.now(timezone.utc).isoformat()
    for mid in member_ids:
        conn.execute(
            "UPDATE widget_member_registry SET hydration_requested_at = ?, next_scan_at = NULL "
            "WHERE widget_id = ? AND domain_key = ? AND member_id = ?",
            (now, widget_id, domain_key, mid),
        )


# ── Endpoints ──

@router.put("/widgets/{widget_id}/treemap-config")
def save_widget_config(widget_id: str, body: WidgetConfigSave):
    if body.primary_interval_minutes <= 0 or body.secondary_interval_minutes <= 0:
        raise HTTPException(status_code=400, detail="intervals must be > 0")

    conn = _conn()
    now = datetime.now(timezone.utc).isoformat()

    # Load existing rows to preserve data_state for unchanged members
    old_rows = {
        (r["domain_key"], r["member_id"]): dict(r)
        for r in conn.execute(
            "SELECT * FROM widget_member_registry WHERE widget_id = ?", (widget_id,)
        ).fetchall()
    }

    # Delete rows that are no longer in the new config
    new_keys = {(body.group, m.member_id) for m in body.members}
    for key in old_rows:
        if key not in new_keys:
            conn.execute(
                "DELETE FROM widget_member_registry WHERE widget_id=? AND domain_key=? AND member_id=?",
                (widget_id, key[0], key[1]),
            )

    # Upsert each member
    new_member_ids = []
    for m in body.members:
        existing = old_rows.get((body.group, m.member_id))
        # Preserve data_state if domain and member unchanged
        data_state = "saved_empty"
        if existing and existing.get("domain_key") == body.group:
            data_state = existing.get("data_state", "saved_empty")

        conn.execute(
            """INSERT INTO widget_member_registry
               (widget_id, domain_key, member_id, tier, enabled, display_order,
                data_state, primary_interval_minutes, secondary_interval_minutes,
                next_scan_at, last_scan_at, last_hydrated_at, hydration_requested_at,
                created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)
               ON CONFLICT(widget_id, domain_key, member_id) DO UPDATE SET
                 tier=excluded.tier, enabled=excluded.enabled,
                 display_order=excluded.display_order, data_state=excluded.data_state,
                 primary_interval_minutes=excluded.primary_interval_minutes,
                 secondary_interval_minutes=excluded.secondary_interval_minutes,
                 next_scan_at=NULL, updated_at=excluded.updated_at""",
            (widget_id, body.group, m.member_id, m.tier, int(m.enabled),
             m.display_order, data_state, body.primary_interval_minutes,
             body.secondary_interval_minutes, now, now),
        )
        if not existing:
            new_member_ids.append(m.member_id)

    conn.commit()

    # Trigger hydration for new members
    if new_member_ids:
        _enqueue_hydration(conn, widget_id, body.group, new_member_ids)
        conn.commit()

    conn.close()
    return {"ok": True, "new_members": len(new_member_ids)}


@router.get("/widgets/{widget_id}/members")
def get_widget_members(widget_id: str):
    conn = _conn()
    rows = conn.execute(
        "SELECT wmr.*, m.name as member_name, m.label as member_label, m.aliases as member_aliases "
        "FROM widget_member_registry wmr "
        "LEFT JOIN members m ON m.id = wmr.member_id "
        "WHERE wmr.widget_id = ? ORDER BY wmr.display_order, wmr.member_id",
        (widget_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
