"""Article relevance scoring: is this article truly ABOUT the member?"""

import re


class ArticleRelevanceEngine:
    def __init__(self):
        self.comparison_patterns = [
            r"similar to",
            r"like .+",
            r"competes with",
            r"competitor to",
            r"alternative to",
            r"compared (to|with)",
            r"rival(?:ing)?",
        ]

    def score(self, article: dict, member_name: str, aliases: list) -> float:
        """Score how relevant an article is to a member. 0.0-1.0."""
        title = (article.get("title") or "").lower()
        snippet = (article.get("snippet") or "").lower()
        content = (article.get("content_text") or "").lower()

        if not title and not snippet:
            return 0.0

        all_terms = [member_name.lower()] + [a.lower() for a in aliases if a]
        if not all_terms:
            return 0.0

        # Title match
        title_match = any(t in title for t in all_terms)

        # Lead/snippet match
        lead_match = any(t in snippet for t in all_terms)

        # Mention density
        all_text = f"{title} {snippet} {content}"
        mention_count = sum(all_text.count(t) for t in all_terms)
        text_len = max(len(all_text.split()), 1)
        mention_density = min(1.0, mention_count / max(text_len * 0.02, 1))

        # First mention position (earlier = better)
        first_pos = len(all_text)
        for t in all_terms:
            pos = all_text.find(t)
            if pos >= 0 and pos < first_pos:
                first_pos = pos
        first_mention_score = max(0, 1.0 - (first_pos / max(len(all_text), 1)))

        # Comparison-only penalty
        comparison_penalty = 0.0
        for pattern in self.comparison_patterns:
            if re.search(pattern, all_text):
                comparison_penalty = 0.45
                break

        score = (
            0.30 * (1.0 if title_match else 0.0)
            + 0.20 * (1.0 if lead_match else 0.0)
            + 0.20 * mention_density
            + 0.15 * first_mention_score
            + 0.15 * 0.5  # base trust placeholder
            - comparison_penalty
        )

        return max(0.0, min(1.0, score))

    def analyze(self, article: dict, member_name: str, aliases: list) -> dict:
        """Full analysis: score + noise type detection."""
        score = self.score(article, member_name, aliases)

        # Noise detection
        noise_type = None
        title = (article.get("title") or "").lower()
        snippet = (article.get("snippet") or "").lower()
        content = (article.get("content_text") or "").lower()
        all_text = f"{title} {snippet} {content}"

        all_terms = [member_name.lower()] + [a.lower() for a in aliases if a]
        mention_count = sum(all_text.count(t) for t in all_terms)

        # Comparison-only detection: member only referenced as comparison target
        for pattern in self.comparison_patterns:
            if re.search(pattern, all_text):
                if member_name.lower() not in title:
                    noise_type = "comparison_only"
                    break

        # Passing mention detection
        if noise_type is None and mention_count <= 1 and not any(
            t in title for t in all_terms
        ):
            noise_type = "passing_mention"

        # Irrelevant
        if noise_type is None and score < 0.20:
            noise_type = "irrelevant"

        return {
            "relevance_score": score,
            "noise_type": noise_type,
            "title_match": any(t in title for t in all_terms),
            "lead_match": any(t in snippet for t in all_terms),
            "mention_count": mention_count,
        }
