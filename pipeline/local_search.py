"""Local article search using FTS5 and alias matching."""


class LocalArticleSearch:
    def __init__(self, conn):
        self.conn = conn

    def search(
        self,
        member_name: str,
        aliases: list = None,
        lookback_days: int = 14,
        max_candidates: int = 10,
        min_score: float = 0.35,
    ) -> list:
        """Search local RSS cache for articles matching member."""
        aliases = aliases or []
        all_terms = [member_name] + aliases
        if not all_terms:
            return []

        # Build FTS query: OR all terms
        fts_query = " OR ".join(f'"{t}"' for t in all_terms if t)

        # FTS search with lookback filter
        rows = self.conn.execute(
            """
            SELECT ra.*, s.trust_score, s.source_tier
            FROM article_fts
            JOIN rss_articles ra ON ra.rowid = article_fts.rowid
            LEFT JOIN sources s ON s.id = ra.source_id
            WHERE article_fts MATCH ?
              AND ra.lifecycle_status IN ('fresh', 'processed')
              AND ra.fetched_at >= date('now', ?)
            ORDER BY rank
            LIMIT ?
        """,
            (fts_query, f"-{lookback_days} days", max_candidates * 5),
        ).fetchall()

        results = []
        for row in rows:
            article = dict(row)
            score = self._score(article, member_name, aliases)
            if score >= min_score:
                article["retrieval_score"] = score
                results.append(article)

        # Sort by score descending, limit
        results.sort(key=lambda x: x["retrieval_score"], reverse=True)
        return results[:max_candidates]

    def _score(self, article: dict, member_name: str, aliases: list) -> float:
        title = (article.get("title") or "").lower()
        snippet = (article.get("snippet") or "").lower()
        content = (article.get("content_text") or "").lower()
        all_text = f"{title} {snippet} {content}"

        member_lower = member_name.lower()
        alias_lowers = [a.lower() for a in aliases]
        all_terms = [member_lower] + alias_lowers

        # Title match — primary member name gets extra weight
        primary_in_title = member_lower in title
        alias_in_title = any(a in title for a in alias_lowers)
        title_match = primary_in_title or alias_in_title

        # Snippet/lead match
        lead_match = any(t in snippet for t in all_terms)

        # Mention count in all text
        mention_count = sum(all_text.count(t) for t in all_terms)

        # Source trust
        trust = article.get("trust_score", 0.5) or 0.5

        score = 0.0
        if title_match:
            score += 0.40
            # Bonus for primary member name in title over alias
            if primary_in_title:
                score += 0.10
        if lead_match:
            score += 0.25
        if mention_count >= 3:
            score += 0.15
        elif mention_count >= 1:
            score += 0.05
        score += 0.15 * trust

        return min(1.0, score)
