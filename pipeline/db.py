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
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  type   TEXT NOT NULL,
  url    TEXT NOT NULL UNIQUE,
  weight REAL NOT NULL DEFAULT 1.0
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
"""

MIGRATIONS = {
    "members": [
        ("baseline_influence", "REAL NOT NULL DEFAULT 20.0"),
        ("baseline_confidence", "REAL NOT NULL DEFAULT 0.0"),
        ("baseline_rationale", "TEXT"),
    ],
    "events": [
        ("impact_weight", "REAL"),
        ("impact_persistence_days", "REAL"),
        ("impact_confidence", "REAL"),
        ("impact_rationale", "TEXT"),
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
    _ensure_columns(conn)
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
