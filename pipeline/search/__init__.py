from .base import SearchResult, SearchResponse, SearchProvider
from .router import SearchRouter, register_provider

# Import provider modules so @register_provider decorators execute
from . import tavily, serper, bocha, duckduckgo, searxng  # noqa: F401
