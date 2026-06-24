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
    """Check X-API-Key header against the effective API key.

    If no key is configured (DB or env), all requests pass through.
    """

    WHITELIST = frozenset({"/health", "/auth/verify", "/docs", "/openapi.json"})

    async def dispatch(self, request, call_next):
        # CORS preflight — no custom headers, always allow
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path

        # Whitelisted paths
        if path in self.WHITELIST:
            return await call_next(request)

        # Static assets
        if path.startswith("/assets") or (
            "." in path.split("/")[-1] and not path.startswith("/ai/")
        ):
            return await call_next(request)

        # Check API key
        api_key = get_effective_api_key()
        if api_key:
            provided = request.headers.get("x-api-key", "")
            if not hmac.compare_digest(provided, api_key):
                return JSONResponse(
                    {"ok": False, "error": "Unauthorized"},
                    status_code=401,
                )

        # No key configured or key matches → pass through
        return await call_next(request)
