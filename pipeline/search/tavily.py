import json
import os
import time
import urllib.request

from .base import SearchProvider, SearchResponse, SearchResult
from .router import register_provider


@register_provider
class TavilyProvider(SearchProvider):
    name = "tavily"

    def __init__(self, conn, config: dict):
        self._timeout = config.get("timeout_sec", 8)
        row = conn.execute(
            "SELECT value FROM settings WHERE key = 'tavily_api_key'"
        ).fetchone()
        self._api_key = (row["value"] if row else "") or os.environ.get(
            "TAVILY_API_KEY", ""
        )

    def search(self, query: str, max_results: int = 5, timeout: int = 8) -> SearchResponse:
        if not self._api_key:
            return SearchResponse(provider=self.name, error="no API key configured")
        t0 = time.monotonic()
        try:
            req = urllib.request.Request(
                "https://api.tavily.com/search",
                data=json.dumps(
                    {
                        "api_key": self._api_key,
                        "query": query,
                        "max_results": max_results,
                    }
                ).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                data = json.loads(resp.read())
                results = [
                    SearchResult(
                        title=r["title"],
                        url=r["url"],
                        snippet=r.get("content", "")[:300],
                    )
                    for r in data.get("results", [])
                ]
                latency = int((time.monotonic() - t0) * 1000)
                return SearchResponse(
                    provider=self.name, results=results, latency_ms=latency
                )
        except Exception as e:
            latency = int((time.monotonic() - t0) * 1000)
            return SearchResponse(
                provider=self.name, latency_ms=latency, error=str(e)
            )
