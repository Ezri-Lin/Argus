import time

from .base import SearchProvider, SearchResponse, SearchResult
from .router import register_provider


@register_provider
class DuckDuckGoProvider(SearchProvider):
    name = "duckduckgo"

    def __init__(self, conn, config: dict):
        self._timeout = config.get("timeout_sec", 8)

    def search(self, query: str, max_results: int = 5, timeout: int = 8) -> SearchResponse:
        t0 = time.monotonic()
        try:
            from duckduckgo_search import DDGS

            with DDGS() as ddgs:
                raw = list(ddgs.text(query, max_results=max_results))
                results = [
                    SearchResult(
                        title=r.get("title", ""),
                        url=r.get("href", ""),
                        snippet=r.get("body", "")[:300],
                    )
                    for r in raw
                ]
                latency = int((time.monotonic() - t0) * 1000)
                return SearchResponse(
                    provider=self.name, results=results, latency_ms=latency
                )
        except ImportError:
            return SearchResponse(
                provider=self.name, error="duckduckgo-search not installed"
            )
        except Exception as e:
            latency = int((time.monotonic() - t0) * 1000)
            return SearchResponse(
                provider=self.name, latency_ms=latency, error=str(e)
            )
