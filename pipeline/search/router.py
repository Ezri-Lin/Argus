from __future__ import annotations

import time
from datetime import datetime, timezone

from .base import SearchProvider, SearchResponse

# Registry: name -> provider class (populated by @register_provider)
_PROVIDER_REGISTRY: dict[str, type[SearchProvider]] = {}


def register_provider(cls: type[SearchProvider]) -> type[SearchProvider]:
    _PROVIDER_REGISTRY[cls.name] = cls
    return cls


class SearchRouter:
    """Deterministic search router with fallback and logging."""

    def __init__(self, conn, profile: str = "deep"):
        self._conn = conn
        self._profile = profile
        self._providers = self._load_providers()

    def _load_providers(self) -> list[SearchProvider]:
        # Filter by profile: discovery router only loads discovery/both, deep only loads deep/both
        rows = self._conn.execute(
            "SELECT * FROM search_providers WHERE enabled = 1 "
            "AND (profile = ? OR profile = 'both') ORDER BY priority ASC",
            (self._profile,),
        ).fetchall()
        providers: list[SearchProvider] = []
        for row in rows:
            name = row["name"]
            cls = _PROVIDER_REGISTRY.get(name)
            if cls:
                providers.append(cls(self._conn, dict(row)))
        return providers

    def _check_daily_cap(self, provider_name: str, cap: int) -> bool:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        row = self._conn.execute(
            "SELECT COUNT(*) as cnt FROM search_logs WHERE provider = ? AND ts >= ?",
            (provider_name, today),
        ).fetchone()
        return (row["cnt"] or 0) < cap

    def _get_provider_cap(self, provider_name: str) -> int:
        """Get daily_cap for a provider from the providers list."""
        for p in self._providers:
            if p.name == provider_name:
                # Read from DB since providers store config
                row = self._conn.execute(
                    "SELECT daily_cap FROM search_providers WHERE name = ?",
                    (provider_name,),
                ).fetchone()
                return row["daily_cap"] if row else 100
        return 100

    def _log(
        self,
        provider: str,
        query: str,
        response: SearchResponse,
        member_id: str | None = None,
        fallback_used: bool = False,
        fallback_reason: str | None = None,
        trigger_reason: str = "",
    ):
        self._conn.execute(
            "INSERT INTO search_logs "
            "(member_id, profile, provider, query, results_count, latency_ms, "
            "fallback_used, fallback_reason, trigger_reason, cost_estimate_usd) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                member_id,
                self._profile,
                provider,
                query,
                len(response.results),
                response.latency_ms,
                1 if fallback_used else 0,
                fallback_reason,
                trigger_reason,
                response.cost_estimate_usd,
            ),
        )
        self._conn.commit()

    def search(
        self,
        query: str,
        max_results: int = 5,
        member_id: str | None = None,
        trigger_reason: str = "",
    ) -> SearchResponse:
        """Try providers in priority order with fallback."""
        last_error: str | None = None
        for i, provider in enumerate(self._providers):
            cap = self._get_provider_cap(provider.name)
            if not self._check_daily_cap(provider.name, cap):
                self._log(
                    provider.name, query,
                    SearchResponse(provider=provider.name, error="daily cap reached"),
                    member_id, fallback_used=(i > 0),
                    fallback_reason="daily_cap_exceeded", trigger_reason=trigger_reason,
                )
                last_error = "daily cap exceeded"
                continue

            response = provider.search(query, max_results)
            fallback = i > 0
            self._log(
                provider.name, query, response, member_id,
                fallback_used=fallback,
                fallback_reason=last_error if fallback else None,
                trigger_reason=trigger_reason,
            )
            if response.results:
                return response
            last_error = response.error or "zero results"

        return SearchResponse(provider="none", error=last_error or "no providers enabled")

    def discovery(self, member_name: str, **kwargs) -> SearchResponse:
        """Search for a member's recent news."""
        return self.search(member_name, trigger_reason="discovery", **kwargs)

    def deep(self, query: str, **kwargs) -> SearchResponse:
        """Deep search for cross-validation."""
        return self.search(query, trigger_reason="deep", **kwargs)
