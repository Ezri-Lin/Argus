"""SourceDiscoveryEngine: auto-discover RSS feeds for new members."""

import re
import uuid
from urllib.parse import urljoin

from pipeline.helpers import now_iso

try:
    import requests
except ImportError:
    requests = None


COMMON_FEED_PATHS = [
    "/feed",
    "/rss",
    "/rss.xml",
    "/feed.xml",
    "/atom.xml",
    "/blog/feed",
    "/blog/rss",
    "/news/feed",
    "/press/feed",
    "/changelog/feed",
    "/releases.atom",
]


class SourceDiscoveryEngine:
    def __init__(self, conn):
        self.conn = conn

    def _common_feed_paths(self) -> list:
        return COMMON_FEED_PATHS

    def discover_from_url(self, site_url: str, member_id: str) -> list:
        """Discover RSS feeds from a site URL."""
        if requests is None:
            return []

        candidates = []
        try:
            resp = requests.get(
                site_url, timeout=10, headers={"User-Agent": "ArgusBot/1.0"}
            )
            if resp.status_code == 200:
                # Look for <link rel="alternate" type="application/rss+xml">
                for match in re.finditer(
                    r'<link[^>]+type=["\']application/(rss|atom)\+xml["\'][^>]*>',
                    resp.text,
                    re.IGNORECASE,
                ):
                    tag = match.group(0)
                    href_match = re.search(r'href=["\']([^"\']+)["\']', tag)
                    if href_match:
                        feed_url = urljoin(site_url, href_match.group(1))
                        candidates.append(
                            {
                                "feed_url": feed_url,
                                "site_url": site_url,
                                "member_id": member_id,
                                "source": "html_link",
                            }
                        )
        except Exception:
            pass

        # Try common paths if no feeds found from HTML
        if not candidates:
            for path in self._common_feed_paths():
                feed_url = urljoin(site_url, path)
                try:
                    resp = requests.get(
                        feed_url,
                        timeout=5,
                        headers={"User-Agent": "ArgusBot/1.0"},
                    )
                    if resp.status_code == 200 and (
                        "<?xml" in resp.text[:200] or "<rss" in resp.text[:500]
                    ):
                        candidates.append(
                            {
                                "feed_url": feed_url,
                                "site_url": site_url,
                                "member_id": member_id,
                                "source": "common_path",
                            }
                        )
                        break
                except Exception:
                    continue

        return candidates

    def _score_candidate(self, candidate: dict) -> float:
        feed_url = candidate.get("feed_url", "").lower()
        site_url = candidate.get("site_url", "").lower()
        member = candidate.get("member_name", "").lower()

        score = 0.0
        # Domain match
        if member.replace(" ", "") in feed_url:
            score += 0.35
        if member.replace(" ", "") in site_url:
            score += 0.25
        # Common feed path
        if any(p in feed_url for p in ["/feed", "/rss", "/blog"]):
            score += 0.20
        # Official-looking
        if any(p in feed_url for p in ["/press", "/changelog", "/releases"]):
            score += 0.15
        return min(1.0, score)

    def _save_candidate(
        self,
        member_id: str,
        name: str,
        site_url: str,
        feed_url: str,
        score: float,
        reason: str,
    ):
        candidate_id = str(uuid.uuid4())[:8]
        is_official = "official" in name.lower()
        status = "auto_enabled" if score >= 0.85 and is_official else "candidate"
        self.conn.execute(
            """
            INSERT INTO source_candidates
            (id, member_id, name, site_url, feed_url, discovery_score, discovery_reason, status, discovered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                candidate_id,
                member_id,
                name,
                site_url,
                feed_url,
                score,
                reason,
                status,
                now_iso(),
            ),
        )
        self.conn.commit()
