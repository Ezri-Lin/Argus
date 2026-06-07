from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str = ""
    outlet: str = ""
    published: str = ""

    def to_dict(self) -> dict:
        return {"title": self.title, "url": self.url, "snippet": self.snippet[:300]}


@dataclass
class SearchResponse:
    provider: str
    results: list[SearchResult] = field(default_factory=list)
    latency_ms: int = 0
    error: str | None = None
    cost_estimate_usd: float = 0.0


class SearchProvider(ABC):
    name: str

    @abstractmethod
    def search(self, query: str, max_results: int = 5, timeout: int = 8) -> SearchResponse:
        ...
