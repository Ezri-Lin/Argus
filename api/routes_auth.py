"""Auth verification and config endpoints."""

import hmac
import os

from fastapi import APIRouter
from pydantic import BaseModel

from pipeline.db import get_db, get_setting, set_setting

router = APIRouter(prefix="/auth", tags=["auth"])


def _conn():
    return get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))


class VerifyRequest(BaseModel):
    key: str


@router.post("/verify")
def verify_key(body: VerifyRequest):
    """Verify an API key against the effective key (DB or env)."""
    from .auth import get_effective_api_key
    api_key = get_effective_api_key()
    if not api_key:
        return {"ok": True, "auth_required": False}
    if hmac.compare_digest(body.key, api_key):
        return {"ok": True, "auth_required": True}
    return {"ok": False, "error": "Invalid key"}


@router.get("/config")
def get_auth_config():
    """Return current auth status (no key value exposed)."""
    from .auth import get_effective_api_key
    api_key = get_effective_api_key()
    return {"ok": True, "auth_enabled": bool(api_key)}


class UpdateAuthRequest(BaseModel):
    current_key: str = ""
    new_key: str


@router.put("/config")
def update_auth_config(body: UpdateAuthRequest):
    """Update the API key. Validates current key first if auth is enabled."""
    from .auth import get_effective_api_key, invalidate_api_key_cache

    current = get_effective_api_key()

    # If auth is enabled, verify current key
    if current:
        if not body.current_key or not hmac.compare_digest(body.current_key, current):
            return {"ok": False, "error": "Current key is incorrect"}

    new_key = body.new_key.strip()

    conn = _conn()
    try:
        if new_key:
            set_setting(conn, "api_key", new_key)
        else:
            # Empty key = disable auth
            conn.execute("DELETE FROM settings WHERE key = 'api_key'")
        conn.commit()
    finally:
        conn.close()

    invalidate_api_key_cache()
    return {"ok": True, "auth_enabled": bool(new_key)}
