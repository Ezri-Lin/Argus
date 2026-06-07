"""Provider health check utilities."""

from dataclasses import dataclass

try:
    import requests
except ImportError:
    requests = None


@dataclass
class ProviderHealth:
    provider: str
    status: str  # healthy | unavailable | degraded | disabled
    latency_ms: float = 0
    error: str = ""


def check_searxng_health(base_url: str, timeout_sec: float = 8.0) -> ProviderHealth:
    """Check if SearXNG instance is reachable and responding."""
    if requests is None:
        return ProviderHealth("searxng", "unavailable", error="requests not installed")

    try:
        resp = requests.get(f"{base_url}/healthz", timeout=timeout_sec)
        latency = resp.elapsed.total_seconds() * 1000
        if resp.status_code == 200:
            if latency > timeout_sec * 1000:
                return ProviderHealth("searxng", "degraded", latency)
            return ProviderHealth("searxng", "healthy", latency)
        return ProviderHealth("searxng", "unavailable", latency, f"HTTP {resp.status_code}")
    except Exception as e:
        return ProviderHealth("searxng", "unavailable", error=str(e))


def get_all_provider_health(conn) -> list:
    """Get health status for all configured providers."""
    rows = conn.execute(
        "SELECT name, health_status, last_error FROM search_providers"
    ).fetchall()
    return [
        ProviderHealth(
            r["name"], r["health_status"] or "unknown", error=r["last_error"] or ""
        )
        for r in rows
    ]
