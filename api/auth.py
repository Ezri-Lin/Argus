"""API key authentication middleware.

Reads api_key from settings table (DB) with ARGUS_API_KEY env var fallback.
Key is cached in memory, refreshed every 30 seconds.
"""

import hmac
import os
import time

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# In-memory cache for the API key from DB
_cached_key: str | None = None
_cache_ts: float = 0
_CACHE_TTL = 30  # seconds


def _get_api_key_from_db() -> str:
    """Read api_key from settings table. Returns "" on any failure."""
    try:
        from pipeline.db import get_db
        db_path = os.environ.get("ARGUS_DB_PATH", "data/argus.db")
        conn = get_db(db_path)
        row = conn.execute("SELECT value FROM settings WHERE key = 'api_key'").fetchone()
        conn.close()
        return (row["value"] if row else "").strip()
    except Exception:
        return ""


def get_effective_api_key() -> str:
    """Get the active API key: DB settings → env var → empty (no auth)."""
    global _cached_key, _cache_ts
    now = time.monotonic()
    if _cached_key is None or (now - _cache_ts) > _CACHE_TTL:
        db_key = _get_api_key_from_db()
        _cached_key = db_key or os.environ.get("ARGUS_API_KEY", "").strip()
        _cache_ts = now
    return _cached_key


def invalidate_api_key_cache():
    """Force re-read on next request (called after PUT /auth/config)."""
    global _cached_key, _cache_ts
    _cached_key = None
    _cache_ts = 0


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Enforce API key auth.

    Authenticated mode (a key is configured in DB or env):
      - All non-whitelisted requests require a matching X-API-Key header.
      - Missing/wrong key → 401.

    Guest mode (no key configured anywhere — key env var unset, DB row absent):
      - GET/HEAD/OPTIONS are allowed (read-only public access).
      - All write methods (POST/PUT/PATCH/DELETE) → 403.
    """

    WHITELIST = frozenset({"/health", "/auth/verify", "/auth/config", "/docs", "/openapi.json"})
    READ_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})

    async def dispatch(self, request, call_next):
        # CORS preflight — no custom headers, always allow
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path

        # Whitelisted paths (auth introspection, docs, health)
        if path in self.WHITELIST:
            return await call_next(request)

        # Static assets
        if path.startswith("/assets") or (
            "." in path.split("/")[-1] and not path.startswith("/ai/")
        ):
            return await call_next(request)

        api_key = get_effective_api_key()

        if api_key:
            # Authenticated mode: require matching X-API-Key on all non-whitelisted paths
            provided = request.headers.get("x-api-key", "")
            if not hmac.compare_digest(provided, api_key):
                return JSONResponse(
                    {"ok": False, "error": "Unauthorized"},
                    status_code=401,
                )
            return await call_next(request)

        # Guest mode (no key configured): read-only
        if request.method in self.READ_METHODS:
            return await call_next(request)
        return JSONResponse(
            {"ok": False, "error": "Guest mode is read-only"},
            status_code=403,
        )
