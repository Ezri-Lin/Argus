"""Pure utility functions used across pipeline modules."""

import hashlib
from datetime import datetime, timezone


def fingerprint(url: str, title: str) -> str:
    return hashlib.sha256(f"{url}|{title}".encode()).hexdigest()[:16]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_text(value: object, limit: int = 500) -> str:
    try:
        text = str(value)
    except Exception:
        text = repr(value)
    return text.encode("utf-8", errors="replace").decode("utf-8")[:limit]


def clamp_float(value: object, low: float, high: float, default: float) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        n = default
    return max(low, min(high, n))
