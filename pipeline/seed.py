"""Seed all v2 tables from watchlist.json + sources.json. Idempotent."""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))

from db import init_db, set_setting

load_dotenv(Path(__file__).parent.parent / ".env")


def seed(db_path: str | None = None):
    conn = init_db(db_path)

    # Load watchlist.json (domains, members, models, settings)
    wl_file = Path(__file__).parent / "watchlist.json"
    with open(wl_file) as f:
        wl = json.load(f)

    # Seed sources from watchlist
    for src in wl.get("sources", []):
        conn.execute(
            "INSERT INTO sources (name, type, url, weight) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(url) DO UPDATE SET name=excluded.name, weight=excluded.weight",
            (src["name"], src["type"], src["url"], src.get("weight", 1.0)),
        )

    # Seed domains
    for d in wl.get("domains", []):
        conn.execute(
            "INSERT INTO domains (key, label_zh, label_en, weight, aliases) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(key) DO UPDATE SET label_zh=excluded.label_zh, weight=excluded.weight",
            (d["key"], d["label_zh"], d.get("label_en", ""), d.get("weight", 1.0),
             json.dumps(d.get("aliases", []), ensure_ascii=False)),
        )

    # Seed members + memberships
    for m in wl.get("members", []):
        cur = conn.execute(
            "INSERT INTO members (name, label_zh, label_en, aliases, symbol, baseline_influence) "
            "VALUES (?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(name) DO UPDATE SET label_zh=excluded.label_zh, symbol=excluded.symbol",
            (
                m["name"], m.get("label_zh", ""), m.get("label_en", ""),
                json.dumps(m.get("aliases", []), ensure_ascii=False),
                m.get("symbol"),
                m.get("baseline_influence", 20.0),
            ),
        )
        member_id = cur.lastrowid
        if member_id == 0:
            row = conn.execute("SELECT id FROM members WHERE name = ?", (m["name"],)).fetchone()
            member_id = row["id"]

        for domain_key in m.get("domains", []):
            conn.execute(
                "INSERT INTO memberships (member_id, domain, role, role_weight) "
                "VALUES (?, ?, 'Primary', 1.0) "
                "ON CONFLICT(member_id, domain) DO NOTHING",
                (member_id, domain_key),
            )

    # Seed models
    model_map = {}
    for m in wl.get("models", []):
        # Resolve env var references
        base_url = os.environ.get(m["base_url"], m["base_url"]) if m["base_url"].startswith("ARGUS_") else m["base_url"]
        api_key = os.environ.get(m["api_key"], m["api_key"]) if m["api_key"].startswith("ARGUS_") else m["api_key"]
        model_name = os.environ.get(m["model"], m["model"]) if m["model"].startswith("ARGUS_") else m["model"]

        cur = conn.execute(
            "INSERT INTO models (label, base_url, api_key, model, web_search, extra) "
            "VALUES (?, ?, ?, ?, ?, '{}')",
            (m["label"], base_url, api_key, model_name, m.get("web_search", 0)),
        )
        model_map[m["role"]] = cur.lastrowid

    # Seed model_roles
    for role, model_id in model_map.items():
        conn.execute(
            "INSERT INTO model_roles (role, model_id) VALUES (?, ?) "
            "ON CONFLICT(role) DO UPDATE SET model_id=excluded.model_id",
            (role, model_id),
        )

    # Seed settings (only insert missing keys — don't overwrite user changes)
    for key, value in wl.get("settings", {}).items():
        existing = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        if not existing:
            conn.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (key, value))

    conn.commit()

    # Print summary
    counts = {
        "sources": conn.execute("SELECT COUNT(*) FROM sources").fetchone()[0],
        "domains": conn.execute("SELECT COUNT(*) FROM domains").fetchone()[0],
        "members": conn.execute("SELECT COUNT(*) FROM members").fetchone()[0],
        "memberships": conn.execute("SELECT COUNT(*) FROM memberships").fetchone()[0],
        "models": conn.execute("SELECT COUNT(*) FROM models").fetchone()[0],
        "model_roles": conn.execute("SELECT COUNT(*) FROM model_roles").fetchone()[0],
        "settings": conn.execute("SELECT COUNT(*) FROM settings").fetchone()[0],
    }
    for table, count in counts.items():
        print(f"  {table}: {count}")
    print("Seed complete.")
    conn.close()


if __name__ == "__main__":
    seed()
