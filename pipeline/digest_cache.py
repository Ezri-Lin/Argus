"""Article digest cache: stores AI-generated summaries to avoid re-reading full text."""

import json
from pipeline.helpers import now_iso


class DigestCache:
    def __init__(self, conn):
        self.conn = conn

    def save(self, article_id: str, summary_short: str = "", summary_long: str = "",
             key_points: list = None, entities: list = None, about_members: list = None,
             event_type: str = "", source_kind: str = "", relevance_score: float = 0.0,
             importance_score: float = 0.0, is_about_primary: int = 0,
             noise_type: str = "", digest_model: str = ""):
        now = now_iso()
        self.conn.execute("""
            INSERT OR REPLACE INTO article_digests
            (article_id, summary_short, summary_long, key_points, entities, about_members,
             event_type, source_kind, relevance_score, importance_score,
             is_about_primary_member, noise_type, digest_model, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            article_id, summary_short, summary_long,
            json.dumps(key_points or []),
            json.dumps(entities or []),
            json.dumps(about_members or []),
            event_type, source_kind, relevance_score, importance_score,
            is_about_primary, noise_type, digest_model, now, now
        ))
        # Also update rss_articles summary fields
        self.conn.execute("""
            UPDATE rss_articles SET
                summary_short = ?, summary_long = ?,
                relevance_score = ?, importance_score = ?,
                summary_model = ?, summary_updated_at = ?
            WHERE id = ?
        """, (summary_short, summary_long, relevance_score, importance_score,
              digest_model, now, article_id))
        self.conn.commit()

    def get(self, article_id: str) -> dict | None:
        row = self.conn.execute(
            "SELECT * FROM article_digests WHERE article_id = ?", (article_id,)
        ).fetchone()
        return dict(row) if row else None

    def choose_payload(self, article: dict) -> str:
        """Choose what to send to AI: digest summary or full text.

        Priority: reread flag -> importance -> digest summary -> full text
        """
        article_id = article["id"]

        if article.get("should_reread"):
            return article.get("content_text", "")

        # Check digest early (needed for importance check and summary fallback)
        digest = self.get(article_id)

        # High importance: read full text (from article or digest)
        importance = article.get("importance_score") or (
            digest.get("importance_score") if digest else None
        )
        if importance and importance >= 0.75:
            return article.get("content_text", "")

        # Use digest summary if available
        if digest and digest.get("summary_short"):
            return digest["summary_short"]

        # Fallback to full text or snippet
        return article.get("content_text") or article.get("snippet", "")

    def mark_reread(self, article_id: str):
        self.conn.execute(
            "UPDATE rss_articles SET should_reread = 1 WHERE id = ?", (article_id,)
        )
        self.conn.commit()
