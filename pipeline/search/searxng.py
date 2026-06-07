import json
import time
import urllib.parse
import urllib.request

from .base import SearchProvider, SearchResponse, SearchResult
from .router import register_provider


@register_provider
class SearXNGProvider(SearchProvider):
    name = "searxng"

    def __init__(self, conn, config: dict):
        self._timeout = config.get("timeout_sec", 8)
        # Instance URL stored in config_json, e.g. {"instance_url": "http://localhost:8888"}
        try:
            cfg = json.loads(config.get("config_json", "{}"))
        except (json.JSONDecodeError, TypeError):
            cfg = {}
        self._instance_url = cfg.get("instance_url", "")

    def search(self, query: str, max_results: int = 5, timeout: int = 8) -> SearchResponse:
        if not self._instance_url:
            return SearchResponse(
                provider=self.name, error="no instance_url in config"
            )
        t0 = time.monotonic()
        try:
            url = f"{self._instance_url}/search?q={urllib.parse.quote(query)}&format=json&pageno=1"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                data = json.loads(resp.read())
                results = [
                    SearchResult(
                        title=r.get("title", ""),
                        url=r.get("url", ""),
                        snippet=r.get("content", "")[:300],
                    )
                    for r in data.get("results", [])[:max_results]
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
