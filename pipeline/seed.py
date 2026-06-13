"""Seed all v2 tables from watchlist.json + sources.json. Idempotent."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))

from db import init_db, set_setting

load_dotenv(Path(__file__).parent.parent / ".env")


def _generate_initial_snapshot(conn):
    """Build a treemap snapshot from seed data so the dashboard shows data immediately."""
    from datetime import datetime, timezone

    domains = conn.execute("SELECT * FROM domains ORDER BY rowid").fetchall()
    children = []
    for domain in domains:
        members = conn.execute(
            "SELECT mb.*, ms.role_weight FROM memberships ms "
            "JOIN members mb ON mb.id = ms.member_id "
            "WHERE ms.domain = ? ORDER BY mb.baseline_influence DESC",
            (domain["key"],),
        ).fetchall()
        member_children = []
        for member in members:
            influence = max(10, member["baseline_influence"] or 20.0)
            member_children.append({
                "name": member["name"],
                "size": max(10, int(round(influence))),
                "sentiment": 0,
                "headline": "",
                "metric": "seed",
                "heat": 0,
                "freshness": 0,
                "influence": round(influence, 2),
                "baselineInfluence": round(influence, 2),
                "impactWeight": 0,
                "impactPersistenceDays": 7,
                "confidence": "confirmed",
                "status": "confirmed",
                "related": [],
            })
        if member_children:
            children.append({
                "name": domain["label"] or domain["key"],
                "key": domain["key"],
                "weight": domain["weight"],
                "children": member_children,
            })

    snapshot = {
        "name": "watchlist",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "children": children,
    }
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO snapshot (id, doc, generated) VALUES ('latest', ?, ?) "
        "ON CONFLICT(id) DO UPDATE SET doc=excluded.doc, generated=excluded.generated",
        (json.dumps(snapshot, ensure_ascii=False), now),
    )
    conn.commit()


def _generate_initial_events(conn):
    """Seed sample events so feed and signals widgets show data on first deploy."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # Map: domain_key → [(member_name, title, sentiment, importance, kind)]
    # All members match watchlist.json exactly.
    SEED_EVENTS = {
        "tech": [
            ("NVIDIA", "NVIDIA Blackwell Ultra GPU enters mass production, 2x inference throughput", 0.6, 0.85, "official"),
            ("Apple", "Apple unveils M5 chip with dedicated AI acceleration cores at WWDC", 0.5, 0.75, "official"),
            ("TSMC", "TSMC confirms 2nm mass production timeline ahead of schedule", 0.4, 0.7, "转载"),
            ("Samsung", "Samsung announces 2nm GAA process node for 2026 volume production", 0.3, 0.6, "official"),
            ("Tesla", "Tesla FSD v13 achieves Level 4 autonomy certification in California", 0.5, 0.7, "official"),
            ("BYD", "BYD surpasses Tesla in global EV sales for Q1 2026", 0.4, 0.65, "转载"),
            ("Korea Chips", "Samsung and SK Hynix secure $15B US CHIPS Act subsidies for advanced packaging", 0.3, 0.6, "转载"),
        ],
        "ai": [
            ("OpenAI", "OpenAI releases GPT-5 with breakthrough reasoning and native tool use", 0.7, 0.9, "official"),
            ("Anthropic", "Anthropic launches Claude Opus 4.6 with 1M context window", 0.6, 0.85, "official"),
            ("Google", "Google DeepMind unveils Gemini 2.5 Ultra with agentic capabilities", 0.5, 0.8, "official"),
            ("Microsoft", "Microsoft Copilot Studio enables enterprise multi-agent workflows", 0.4, 0.7, "official"),
            ("Meta", "Meta releases Llama 4 open-source model with 400B parameters", 0.5, 0.75, "official"),
            ("DeepSeek", "DeepSeek-V3 tops open-source benchmarks, narrows gap with frontier models", 0.6, 0.7, "转载"),
            ("Baidu", "Baidu ERNIE 5.0 achieves GPT-4 level performance on Chinese NLP tasks", 0.3, 0.55, "official"),
            ("NVIDIA", "NVIDIA announces Rubin next-gen AI platform with 8x training throughput", 0.6, 0.8, "official"),
        ],
        "finance": [
            ("JPMorgan", "JPMorgan reports record Q1 trading revenue driven by AI infrastructure demand", 0.5, 0.7, "official"),
            ("Goldman Sachs", "Goldman Sachs raises S&P 500 year-end target to 6,500", 0.4, 0.65, "转载"),
            ("BlackRock", "BlackRock launches tokenized Treasury fund on Ethereum, $10B AUM milestone", 0.4, 0.6, "official"),
            ("Federal Reserve", "Federal Reserve holds rates steady, signals potential cut in September", 0.2, 0.8, "official"),
        ],
        "markets": [
            ("S&P 500", "S&P 500 hits new all-time high at 5,800 as tech earnings beat expectations", 0.6, 0.85, "转载"),
            ("Nasdaq", "Nasdaq Composite crosses 20,000 for first time on AI rally", 0.5, 0.8, "转载"),
            ("Bitcoin", "Bitcoin breaks above $120K as spot ETF inflows accelerate", 0.7, 0.75, "转载"),
            ("Gold", "Gold surges past $3,200 amid geopolitical tensions and rate cut bets", 0.3, 0.6, "转载"),
            ("Oil WTI", "Oil WTI drops to $68 as OPEC+ increases production quotas", -0.2, 0.55, "转载"),
        ],
        "business": [
            ("Amazon", "Amazon Web Services revenue surpasses $110B annual run rate", 0.5, 0.7, "official"),
            ("Microsoft", "Microsoft market cap crosses $4 trillion on Azure AI growth", 0.6, 0.75, "转载"),
            ("Tesla", "Tesla robotaxi service launches in Austin, 10,000 rides in first week", 0.5, 0.7, "official"),
            ("BYD", "BYD enters Japanese market with Dolphin Mini, targets 50K annual sales", 0.3, 0.55, "official"),
            ("Tencent", "Tencent WeChat integrates AI assistant across all mini-programs", 0.4, 0.6, "官方"),
            ("Alibaba", "Alibaba Cloud revenue grows 18% YoY driven by AI model hosting demand", 0.4, 0.6, "官方"),
        ],
        "investment": [
            ("BlackRock", "BlackRock raises $12B new infrastructure fund targeting AI data centers", 0.4, 0.6, "转载"),
            ("JPMorgan", "JPMorgan launches $5B AI-focused venture capital fund", 0.4, 0.55, "official"),
        ],
        "startups": [
            ("DeepSeek", "DeepSeek valued at $15B after Series B, largest AI startup round in China", 0.6, 0.7, "转载"),
            ("Anthropic", "Anthropic reaches $60B valuation, annualized revenue hits $4B", 0.5, 0.65, "转载"),
            ("OpenAI", "OpenAI completes $40B funding round at $300B valuation", 0.5, 0.7, "转载"),
        ],
        "crypto": [
            ("Bitcoin", "Bitcoin ETF inflows hit record $2.5B in single week", 0.6, 0.7, "转载"),
            ("Ethereum", "Ethereum Pectra upgrade live, enables account abstraction and blob scaling", 0.4, 0.6, "official"),
            ("Solana", "Solana processes 100M daily transactions, surpasses all L2s combined", 0.5, 0.55, "转载"),
            ("Coinbase", "Coinbase launches institutional crypto derivatives platform", 0.3, 0.5, "official"),
        ],
        "geo": [
            ("Taiwan Strait", "TSMC Arizona fab on track for 2026 production despite cross-strait tensions", 0.2, 0.7, "转载"),
            ("US-China Trade", "US and China reach preliminary agreement on semiconductor export controls", 0.3, 0.75, "转载"),
            ("Red Sea", "Red Sea shipping disruptions ease as Houthi attacks decline 60%", 0.2, 0.55, "转载"),
            ("India Capex", "India announces $150B infrastructure stimulus targeting semiconductor fabs", 0.3, 0.6, "转载"),
            ("Middle East Energy", "Saudi Arabia accelerates Vision 2030 with $100B AI and tech investment", 0.3, 0.6, "转载"),
            ("Mexico Nearshoring", "Mexico nearshoring investment hits $35B as US firms diversify from China", 0.3, 0.55, "转载"),
        ],
        "policy": [
            ("EU AI Act", "EU AI Act Phase 2 enforcement begins, mandatory compliance for high-risk AI", -0.1, 0.65, "official"),
            ("Federal Reserve", "Federal Reserve signals potential rate cut in September, markets rally", 0.3, 0.75, "official"),
        ],
        "marketing": [
            ("Google", "Google Ads introduces AI-powered campaign optimization by default", 0.3, 0.5, "official"),
            ("Meta", "Meta Advantage+ AI campaigns now drive 40% of total ad revenue", 0.3, 0.55, "official"),
            ("Amazon", "Amazon Ads launches AI-generated product video ads at scale", 0.3, 0.5, "official"),
        ],
        "news": [
            ("NVIDIA", "Global AI chip spending projected to reach $200B in 2026", 0.4, 0.6, "转载"),
            ("OpenAI", "OpenAI and Microsoft renegotiate partnership terms ahead of for-profit conversion", 0.1, 0.65, "转载"),
        ],
    }

    for domain_key, events in SEED_EVENTS.items():
        for member_name, title, sentiment, importance, kind in events:
            # Resolve member_id
            row = conn.execute("SELECT id FROM members WHERE name = ?", (member_name,)).fetchone()
            if not row:
                continue
            member_id = row["id"]
            fingerprint = f"seed:{domain_key}:{member_name}:{hash(title) & 0xFFFFFFFF:08x}"
            conn.execute(
                "INSERT INTO events (fingerprint, member_id, title, sentiment, importance, "
                "kind, status, outlet, published, first_seen, last_seen) "
                "VALUES (?, ?, ?, ?, ?, ?, 'watch', ?, ?, ?, ?) "
                "ON CONFLICT(fingerprint) DO UPDATE SET "
                "title=excluded.title, sentiment=excluded.sentiment, importance=excluded.importance",
                (fingerprint, member_id, title, sentiment, importance, kind,
                 member_name, now_iso, now_iso, now_iso),
            )
    conn.commit()


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
        label = d.get("label", d.get("label_zh", ""))
        conn.execute(
            "INSERT INTO domains (key, label, label_zh, weight, aliases) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(key) DO UPDATE SET label=excluded.label, label_zh=excluded.label_zh, weight=excluded.weight",
            (d["key"], label, label, d.get("weight", 1.0),
             json.dumps(d.get("aliases", []), ensure_ascii=False)),
        )

    # Seed members + memberships
    for m in wl.get("members", []):
        conn.execute(
            "INSERT INTO members (name, label, aliases, symbol, baseline_influence) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(name) DO UPDATE SET label=excluded.label, symbol=excluded.symbol",
            (
                m["name"], m.get("label", m.get("label_zh", "")),
                json.dumps(m.get("aliases", []), ensure_ascii=False),
                m.get("symbol"),
                m.get("baseline_influence", 20.0),
            ),
        )
        row = conn.execute("SELECT id FROM members WHERE name = ?", (m["name"],)).fetchone()
        member_id = row["id"]

        for domain_key in m.get("domains", []):
            conn.execute(
                "INSERT INTO memberships (member_id, domain, role, role_weight) "
                "VALUES (?, ?, 'Primary', 1.0) "
                "ON CONFLICT(member_id, domain) DO NOTHING",
                (member_id, domain_key),
            )

    # Seed models (skip if already exists or env vars not configured)
    model_map = {}
    for m in wl.get("models", []):
        existing = conn.execute("SELECT id FROM models WHERE label = ?", (m["label"],)).fetchone()
        if existing:
            model_map[m["role"]] = existing["id"]
            continue
        # Resolve env var references
        def _resolve(val):
            if val.startswith("ARGUS_"):
                return os.environ.get(val, "")
            return val
        base_url = _resolve(m["base_url"])
        api_key = _resolve(m["api_key"])
        model_name = _resolve(m["model"])

        # Skip if required env vars are not set
        if not api_key:
            continue

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

    # Generate initial snapshot so treemap shows data immediately
    _generate_initial_snapshot(conn)

    # Generate initial events so feed and signals show data
    _generate_initial_events(conn)

    # Refresh health timestamps so dashboard shows "ok" instead of degraded/gray
    now = datetime.now(timezone.utc).isoformat()
    for module in ["pipeline", "rss", "base_model", "pro_model", "tavily", "prices"]:
        conn.execute(
            "INSERT INTO health (module, status, last_ok, updated_at) "
            "VALUES (?, 'ok', ?, ?) "
            "ON CONFLICT(module) DO UPDATE SET status='ok', last_ok=excluded.last_ok, updated_at=excluded.updated_at, last_error=NULL",
            (module, now, now),
        )
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
