"""SQLite connection manager — single entry point for all DB access.

Full v2 schema: 11 tables per data-contract.md + M3-backend-v2.md.
"""

import os
import sqlite3
from pathlib import Path

DB_PATH = os.environ.get("ARGUS_DB_PATH", "data/argus.db")

SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Sources (RSS feeds, twitter, etc.)
CREATE TABLE IF NOT EXISTS sources (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  type     TEXT NOT NULL,
  url      TEXT NOT NULL UNIQUE,
  weight   REAL NOT NULL DEFAULT 1.0,
  logo_url TEXT
);

-- Domains (e.g. "llm", "chips", "markets")
CREATE TABLE IF NOT EXISTS domains (
  key       TEXT PRIMARY KEY,
  label_zh  TEXT NOT NULL,
  label_en  TEXT,
  weight    REAL NOT NULL DEFAULT 1.0,
  aliases   TEXT NOT NULL DEFAULT '[]'
);

-- Members (e.g. "OpenAI", "NVIDIA", "BTC")
CREATE TABLE IF NOT EXISTS members (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  label_zh  TEXT,
  label_en  TEXT,
  aliases   TEXT NOT NULL DEFAULT '[]',
  symbol    TEXT,
  baseline_influence REAL NOT NULL DEFAULT 20.0,
  baseline_confidence REAL NOT NULL DEFAULT 0.0,
  baseline_rationale TEXT
);

-- Members ↔ Domains (many-to-many with weight)
CREATE TABLE IF NOT EXISTS memberships (
  member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  domain      TEXT    NOT NULL REFERENCES domains(key) ON DELETE CASCADE,
  role        TEXT    NOT NULL DEFAULT 'Primary',
  role_weight REAL    NOT NULL DEFAULT 1.0,
  tier        TEXT    NOT NULL DEFAULT 'secondary',
  enabled     INTEGER NOT NULL DEFAULT 1,
  refresh_interval_minutes INTEGER,
  last_scanned_at TEXT,
  next_scan_at    TEXT,
  source      TEXT    NOT NULL DEFAULT 'manual',
  promoted_at TEXT,
  dismissed_at TEXT,
  PRIMARY KEY (member_id, domain)
);

-- Events (news items, analyzed by pipeline)
CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY,
  fingerprint  TEXT NOT NULL UNIQUE,
  member_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  url          TEXT,
  outlet       TEXT,
  published    TEXT,
  sentiment    REAL,
  importance   REAL,
  impact_weight REAL,
  impact_persistence_days REAL,
  impact_confidence REAL,
  impact_rationale TEXT,
  kind         TEXT,
  event_type   TEXT,
  status       TEXT DEFAULT 'watch',
  note         TEXT,
  rumor        REAL NOT NULL DEFAULT 1.0,
  sources      TEXT NOT NULL DEFAULT '[]',
  need_pro     INTEGER NOT NULL DEFAULT 0,
  route_reason TEXT,
  first_seen   TEXT NOT NULL,
  last_seen    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_member    ON events(member_id);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(published);

-- Model registry
CREATE TABLE IF NOT EXISTS models (
  id         INTEGER PRIMARY KEY,
  label      TEXT NOT NULL,
  base_url   TEXT,
  api_key    TEXT,
  model      TEXT NOT NULL,
  web_search INTEGER NOT NULL DEFAULT 0,
  extra      TEXT NOT NULL DEFAULT '{}'
);

-- Model role assignment (base / pro)
CREATE TABLE IF NOT EXISTS model_roles (
  role     TEXT PRIMARY KEY CHECK (role IN ('base', 'pro')),
  model_id INTEGER NOT NULL REFERENCES models(id)
);

-- Global settings
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Dashboard layout
CREATE TABLE IF NOT EXISTS dashboard (
  id         TEXT PRIMARY KEY DEFAULT 'default',
  doc        TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Treemap snapshot cache
CREATE TABLE IF NOT EXISTS snapshot (
  id        TEXT PRIMARY KEY DEFAULT 'latest',
  doc       TEXT NOT NULL,
  generated TEXT NOT NULL
);

-- Health self-check
CREATE TABLE IF NOT EXISTS health (
  module     TEXT PRIMARY KEY,
  status     TEXT NOT NULL,
  last_ok    TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL
);

-- Prices (time-series, for v2+)
CREATE TABLE IF NOT EXISTS prices (
  symbol TEXT NOT NULL,
  ts     TEXT NOT NULL,
  open REAL, high REAL, low REAL, close REAL, volume REAL,
  market_cap REAL,
  PRIMARY KEY (symbol, ts)
);

-- Search provider configurations
CREATE TABLE IF NOT EXISTS search_providers (
  name          TEXT PRIMARY KEY,
  profile       TEXT NOT NULL DEFAULT 'both',  -- 'discovery' | 'deep' | 'both'
  enabled       INTEGER NOT NULL DEFAULT 0,
  priority      INTEGER NOT NULL DEFAULT 99,
  daily_cap     INTEGER NOT NULL DEFAULT 100,
  timeout_sec   INTEGER NOT NULL DEFAULT 8,
  config_json   TEXT NOT NULL DEFAULT '{}',
  auth_type     TEXT,                          -- none / api_key / bearer
  health_status TEXT,                          -- ok / degraded / failed
  last_error    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Structured search log
CREATE TABLE IF NOT EXISTS search_logs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  ts               TEXT NOT NULL DEFAULT (datetime('now')),
  member_id        TEXT,
  profile          TEXT NOT NULL,
  provider         TEXT NOT NULL,
  query            TEXT,
  results_count    INTEGER NOT NULL DEFAULT 0,
  latency_ms       INTEGER,
  fallback_used    INTEGER NOT NULL DEFAULT 0,
  fallback_reason  TEXT,
  trigger_reason   TEXT,
  cost_estimate_usd REAL DEFAULT 0,
  decision_json    TEXT                        -- full policy scoring JSON
);
CREATE INDEX IF NOT EXISTS idx_search_logs_ts       ON search_logs(ts);
CREATE INDEX IF NOT EXISTS idx_search_logs_provider ON search_logs(provider);

-- M3: RSS article cache
CREATE TABLE IF NOT EXISTS rss_articles (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    canonical_url TEXT,
    title TEXT NOT NULL,
    snippet TEXT,
    content_text TEXT,
    published_at TEXT,
    fetched_at TEXT NOT NULL,
    hash TEXT,
    language TEXT,
    raw_json TEXT,
    lifecycle_status TEXT DEFAULT 'fresh',
    processed_at TEXT,
    last_relevance_checked_at TEXT,
    last_used_in_event_at TEXT,
    relevance_score REAL,
    importance_score REAL,
    summary_short TEXT,
    summary_long TEXT,
    summary_model TEXT,
    summary_updated_at TEXT,
    read_count INTEGER DEFAULT 0,
    should_reread INTEGER DEFAULT 0,
    discard_reason TEXT,
    discarded_at TEXT,
    discarded_by TEXT,
    FOREIGN KEY(source_id) REFERENCES sources(id)
);

-- M3: FTS5 for article full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS article_fts USING fts5(
    title, snippet, content_text,
    content='rss_articles', content_rowid='rowid'
);

-- M3: Article digest cache
CREATE TABLE IF NOT EXISTS article_digests (
    article_id TEXT PRIMARY KEY,
    summary_short TEXT,
    summary_long TEXT,
    key_points TEXT,
    entities TEXT,
    about_members TEXT,
    event_type TEXT,
    source_kind TEXT,
    relevance_score REAL,
    importance_score REAL,
    is_about_primary_member INTEGER,
    noise_type TEXT,
    digest_model TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY(article_id) REFERENCES rss_articles(id)
);

-- M3: Source discovery candidates
CREATE TABLE IF NOT EXISTS source_candidates (
    id TEXT PRIMARY KEY,
    member_id TEXT,
    domain_id TEXT,
    name TEXT,
    site_url TEXT,
    feed_url TEXT,
    source_tier TEXT,
    source_kind TEXT,
    trust_score REAL,
    discovery_score REAL,
    discovery_reason TEXT,
    status TEXT,
    discovered_at TEXT,
    raw_json TEXT
);

-- Widget-member registry (new SoT for widget-domain-member relationships)
CREATE TABLE IF NOT EXISTS widget_member_registry (
  widget_id TEXT NOT NULL,
  domain_key TEXT NOT NULL,
  member_id INTEGER NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('primary', 'secondary', 'ai_candidate')),
  enabled INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER,
  data_state TEXT NOT NULL DEFAULT 'saved_empty',
  primary_interval_minutes INTEGER NOT NULL DEFAULT 90,
  secondary_interval_minutes INTEGER NOT NULL DEFAULT 90,
  next_scan_at TEXT,
  last_scan_at TEXT,
  last_hydrated_at TEXT,
  hydration_requested_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (widget_id, domain_key, member_id)
);
"""

FTS_TRIGGERS = [
    """
    CREATE TRIGGER IF NOT EXISTS rss_articles_ai AFTER INSERT ON rss_articles BEGIN
        INSERT INTO article_fts(rowid, title, snippet, content_text)
        VALUES (new.rowid, new.title, new.snippet, new.content_text);
    END;
    """,
    """
    CREATE TRIGGER IF NOT EXISTS rss_articles_ad AFTER DELETE ON rss_articles BEGIN
        INSERT INTO article_fts(article_fts, rowid, title, snippet, content_text)
        VALUES ('delete', old.rowid, old.title, old.snippet, old.content_text);
    END;
    """,
    """
    CREATE TRIGGER IF NOT EXISTS rss_articles_au AFTER UPDATE ON rss_articles BEGIN
        INSERT INTO article_fts(article_fts, rowid, title, snippet, content_text)
        VALUES ('delete', old.rowid, old.title, old.snippet, old.content_text);
        INSERT INTO article_fts(rowid, title, snippet, content_text)
        VALUES (new.rowid, new.title, new.snippet, new.content_text);
    END;
    """,
]

MIGRATIONS = {
    "sources": [
        ("logo_url", "TEXT"),
        ("enabled", "INTEGER NOT NULL DEFAULT 1"),
        # M3: source quality tracking
        ("source_tier", "TEXT DEFAULT 'unknown'"),
        ("source_kind", "TEXT DEFAULT 'unknown'"),
        ("trust_score", "REAL DEFAULT 0.5"),
        ("authority_weight", "REAL DEFAULT 0.5"),
        ("freshness_weight", "REAL DEFAULT 0.5"),
        ("language", "TEXT"),
        ("region", "TEXT"),
        ("domain_focus", "TEXT"),
        ("health_status", "TEXT DEFAULT 'unknown'"),
        ("last_fetched_at", "TEXT"),
        ("last_success_at", "TEXT"),
        ("last_error", "TEXT"),
        ("consecutive_failures", "INTEGER DEFAULT 0"),
    ],
    "members": [
        ("baseline_influence", "REAL NOT NULL DEFAULT 20.0"),
        ("baseline_confidence", "REAL NOT NULL DEFAULT 0.0"),
        ("baseline_rationale", "TEXT"),
    ],
    "memberships": [
        ("tier", "TEXT NOT NULL DEFAULT 'secondary'"),
        ("enabled", "INTEGER NOT NULL DEFAULT 1"),
        ("refresh_interval_minutes", "INTEGER"),
        ("last_scanned_at", "TEXT"),
        ("next_scan_at", "TEXT"),
        ("source", "TEXT NOT NULL DEFAULT 'manual'"),
        ("promoted_at", "TEXT"),
        ("dismissed_at", "TEXT"),
    ],
    "events": [
        ("impact_weight", "REAL"),
        ("impact_persistence_days", "REAL"),
        ("impact_confidence", "REAL"),
        ("impact_rationale", "TEXT"),
        ("event_type", "TEXT"),
    ],
    "search_providers": [
        ("profile", "TEXT NOT NULL DEFAULT 'both'"),
        ("auth_type", "TEXT"),
        ("health_status", "TEXT"),
        ("last_error", "TEXT"),
    ],
    "search_logs": [
        ("decision_json", "TEXT"),
    ],
    "domains": [
        ("description", "TEXT DEFAULT ''"),
        ("search_intent", "TEXT DEFAULT ''"),
        ("include_terms", "TEXT DEFAULT '[]'"),
        ("exclude_terms", "TEXT DEFAULT '[]'"),
    ],
}


def get_db(path: str | None = None) -> sqlite3.Connection:
    db_path = Path(path or DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")
    return conn


def init_db(path: str | None = None) -> sqlite3.Connection:
    conn = get_db(path)
    conn.executescript(SCHEMA)
    for trigger_sql in FTS_TRIGGERS:
        conn.execute(trigger_sql)
    _ensure_columns(conn)
    _seed_search_providers(conn)
    _migrate_settings(conn)
    conn.commit()

    db_file = Path(path or DB_PATH)
    if db_file.exists():
        os.chmod(str(db_file), 0o600)

    return conn


def _ensure_columns(conn: sqlite3.Connection):
    """Apply additive schema upgrades for existing SQLite files."""
    for table, columns in MIGRATIONS.items():
        existing = {
            row["name"]
            for row in conn.execute(f"PRAGMA table_info({table})").fetchall()
        }
        for name, definition in columns:
            if name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def _seed_search_providers(conn: sqlite3.Connection):
    """Seed default search providers. Idempotent."""
    # profile: 'discovery' = low-cost scan, 'deep' = on-demand evidence, 'both' = either
    # Default order: SearXNG(discovery) → Serper(fallback) → Bocha(Chinese), Tavily(deep only)
    providers = [
        # (name,      profile,     enabled, priority, daily_cap, timeout, auth_type, config)
        ("searxng",    "discovery", 0,       1,        300,       8,       "none",    "{}"),
        ("serper",     "both",      0,       2,        80,        8,       "api_key", "{}"),
        ("bocha",      "both",      0,       3,        40,        8,       "bearer",  "{}"),
        ("duckduckgo", "both",      0,       99,       100,       8,       "none",    "{}"),
        ("tavily",     "deep",      0,       1,        30,        8,       "api_key", "{}"),
    ]
    for name, profile, enabled, priority, daily_cap, timeout, auth_type, config in providers:
        conn.execute(
            "INSERT OR IGNORE INTO search_providers "
            "(name, profile, enabled, priority, daily_cap, timeout_sec, auth_type, config_json) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (name, profile, enabled, priority, daily_cap, timeout, auth_type, config),
        )
    # Migrate existing rows: update profile for providers that still have default 'both'
    for name, profile, *_ in providers:
        conn.execute(
            "UPDATE search_providers SET profile = ? WHERE name = ? AND profile = 'both' AND ? != 'both'",
            (profile, name, profile),
        )
    # Migrate existing tavily_enabled setting → enable tavily for deep search
    tavily_on = get_setting(conn, "tavily_enabled", "false") == "true"
    if tavily_on:
        conn.execute(
            "UPDATE search_providers SET enabled = 1, updated_at = datetime('now') WHERE name = 'tavily'"
        )


def _migrate_settings(conn: sqlite3.Connection):
    """Migrate deprecated settings keys to new names. Idempotent."""
    # tavily_enabled → deep_search_enabled
    old_val = get_setting(conn, "tavily_enabled", "")
    new_val = get_setting(conn, "deep_search_enabled", "")
    if old_val and not new_val:
        set_setting(conn, "deep_search_enabled", old_val)
    # Set default deep_search_daily_cap if missing
    if not get_setting(conn, "deep_search_daily_cap", ""):
        set_setting(conn, "deep_search_daily_cap", "30")


def get_setting(conn: sqlite3.Connection, key: str, default: str = "") -> str:
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(conn: sqlite3.Connection, key: str, value: str):
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )
    conn.commit()


def get_model_for_role(conn: sqlite3.Connection, role: str) -> dict | None:
    row = conn.execute(
        "SELECT m.* FROM models m JOIN model_roles r ON r.model_id = m.id WHERE r.role = ?",
        (role,),
    ).fetchone()
    return dict(row) if row else None


def get_search_provider(conn: sqlite3.Connection, name: str) -> dict | None:
    row = conn.execute("SELECT * FROM search_providers WHERE name = ?", (name,)).fetchone()
    return dict(row) if row else None


def get_enabled_providers(conn: sqlite3.Connection, profile: str | None = None) -> list[dict]:
    """Return enabled search providers ordered by priority.
    If profile is given, filter by profile (exact match or 'both').
    """
    if profile:
        rows = conn.execute(
            "SELECT * FROM search_providers WHERE enabled = 1 AND (profile = ? OR profile = 'both') ORDER BY priority ASC",
            (profile,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM search_providers WHERE enabled = 1 ORDER BY priority ASC"
        ).fetchall()
    return [dict(r) for r in rows]


def insert_search_log(conn: sqlite3.Connection, **kwargs):
    """Insert a row into search_logs. Keys must match column names."""
    cols = ", ".join(kwargs.keys())
    placeholders = ", ".join("?" * len(kwargs))
    conn.execute(
        f"INSERT INTO search_logs ({cols}) VALUES ({placeholders})",
        list(kwargs.values()),
    )
    conn.commit()
