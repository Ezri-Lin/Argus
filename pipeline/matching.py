"""Member matching: alias resolution, domain lookups, RSS item matching."""

import json
import re

from helpers import safe_text


def member_aliases(member: dict) -> list[str]:
    try:
        return json.loads(member["aliases"])
    except Exception:
        return []


def member_domains(conn, member_id: int) -> list[str]:
    rows = conn.execute(
        "SELECT d.label_zh FROM memberships m JOIN domains d ON d.key = m.domain "
        "WHERE m.member_id = ?", (member_id,)
    ).fetchall()
    return [r["label_zh"] for r in rows]


def matches_member(title: str, snippet: str, member: dict) -> bool:
    """Check if an RSS item mentions this member (word-boundary match)."""
    text = f"{title} {snippet}".lower()
    names = [member["name"].lower()]
    names.extend(a.lower() for a in member_aliases(member))
    if member["symbol"]:
        names.append(member["symbol"].lower())
    for n in names:
        # Chinese names: plain substring (no word boundary concept)
        if any(ord(c) > 0x7F for c in n):
            if n in text:
                return True
        # ASCII names: word-boundary match to avoid false positives
        elif re.search(r'\b' + re.escape(n) + r'\b', text):
            return True
    return False
