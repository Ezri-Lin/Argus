"""Article lifecycle state machine: fresh -> processed -> archived, with discard.

Lifecycle flow:
  fresh      — newly fetched, not yet seen by pipeline
  processed  — seen by pipeline or older than FRESH_MAX_DAYS
  archived   — older than ARCHIVE_MAX_DAYS, filtered from active queries
  discarded  — low relevance or noise, permanently excluded

Articles are never deleted — only status changes.
"""

try:
    from pipeline.helpers import now_iso
except ImportError:
    from helpers import now_iso

FRESH_MAX_DAYS = 3
ARCHIVE_MAX_DAYS = 14

VALID_TRANSITIONS = {
    "fresh": {"processed", "archived", "discarded"},
    "processed": {"archived", "discarded"},
    "archived": {"discarded"},
    "discarded": set(),
}


class ArticleLifecycle:
    def __init__(self, conn):
        self.conn = conn

    def transition(self, article_id: str, new_status: str) -> bool:
        row = self.conn.execute(
            "SELECT lifecycle_status FROM rss_articles WHERE id = ?", (article_id,)
        ).fetchone()
        if not row:
            return False
        current = row["lifecycle_status"]
        if new_status not in VALID_TRANSITIONS.get(current, set()):
            return False

        updates = {"lifecycle_status": new_status}
        if new_status == "processed":
            updates["processed_at"] = now_iso()

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [article_id]
        self.conn.execute(
            f"UPDATE rss_articles SET {set_clause} WHERE id = ?", values
        )
        self.conn.commit()
        return True

    def discard(self, article_id: str, reason: str, by: str = "ai") -> bool:
        now = now_iso()
        self.conn.execute(
            """
            UPDATE rss_articles SET
                lifecycle_status = 'discarded',
                discard_reason = ?,
                discarded_at = ?,
                discarded_by = ?
            WHERE id = ? AND lifecycle_status != 'discarded'
            """,
            (reason, now, by, article_id),
        )
        self.conn.commit()
        return self.conn.total_changes > 0

    def auto_discard_stale(self) -> list:
        """Discard articles with low relevance or noise types."""
        now = now_iso()
        discarded = []

        # Discard low relevance (below 0.30)
        rows = self.conn.execute(
            """
            SELECT id FROM rss_articles
            WHERE lifecycle_status IN ('fresh', 'processed')
              AND relevance_score IS NOT NULL
              AND relevance_score < 0.30
            """
        ).fetchall()

        for row in rows:
            self.conn.execute(
                """
                UPDATE rss_articles SET
                    lifecycle_status = 'discarded',
                    discard_reason = 'low_relevance',
                    discarded_at = ?,
                    discarded_by = 'ai'
                WHERE id = ?
                """,
                (now, row["id"]),
            )
            discarded.append(row["id"])

        # Discard noise types
        noise_rows = self.conn.execute(
            """
            SELECT ra.id FROM rss_articles ra
            JOIN article_digests ad ON ad.article_id = ra.id
            WHERE ra.lifecycle_status IN ('fresh', 'processed')
              AND ad.noise_type IN ('comparison_only', 'passing_mention', 'duplicate')
            """
        ).fetchall()

        for row in noise_rows:
            if row["id"] not in discarded:
                self.conn.execute(
                    """
                    UPDATE rss_articles SET
                        lifecycle_status = 'discarded',
                        discard_reason = 'noise_type',
                        discarded_at = ?,
                        discarded_by = 'ai'
                    WHERE id = ?
                    """,
                    (now, row["id"]),
                )
                discarded.append(row["id"])

        self.conn.commit()
        return discarded

    def archive_stale(self, max_age_days: int = ARCHIVE_MAX_DAYS) -> list:
        """Archive processed (and very old fresh) articles older than max_age_days."""
        rows = self.conn.execute(
            """
            SELECT id FROM rss_articles
            WHERE lifecycle_status IN ('fresh', 'processed')
              AND julianday('now') - julianday(fetched_at) > ?
            """,
            (max_age_days,),
        ).fetchall()

        for row in rows:
            self.conn.execute(
                "UPDATE rss_articles SET lifecycle_status = 'archived' WHERE id = ?",
                (row["id"],),
            )
        self.conn.commit()
        return [r["id"] for r in rows]

    def get_active_articles(self, limit: int = 100) -> list:
        rows = self.conn.execute(
            """
            SELECT * FROM rss_articles
            WHERE lifecycle_status IN ('fresh', 'processed')
            ORDER BY fetched_at DESC LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]

    def mark_processed_batch(self, article_ids: list[str]) -> int:
        """Batch transition fresh → processed for articles analyzed by pipeline."""
        count = 0
        now = now_iso()
        for aid in article_ids:
            self.conn.execute(
                """UPDATE rss_articles
                   SET lifecycle_status = 'processed', processed_at = ?
                   WHERE id = ? AND lifecycle_status = 'fresh'""",
                (now, aid),
            )
            count += self.conn.total_changes
        self.conn.commit()
        return count

    def get_stats(self) -> dict:
        """Return lifecycle distribution counts."""
        rows = self.conn.execute(
            "SELECT lifecycle_status, COUNT(*) as cnt "
            "FROM rss_articles GROUP BY lifecycle_status"
        ).fetchall()
        return {r["lifecycle_status"]: r["cnt"] for r in rows}
