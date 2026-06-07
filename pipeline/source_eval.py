"""SourceEvaluationEngine: track RSS source health and quality."""

from pipeline.helpers import now_iso


class SourceEvaluationEngine:
    def __init__(self, conn):
        self.conn = conn

    def record_fetch_success(self, source_id):
        now = now_iso()
        self.conn.execute("""
            UPDATE sources SET
                last_success_at = ?,
                health_status = 'healthy',
                consecutive_failures = 0
            WHERE id = ?
        """, (now, source_id))
        self.conn.commit()

    def record_fetch_failure(self, source_id, error: str):
        now = now_iso()
        self.conn.execute("""
            UPDATE sources SET
                last_fetched_at = ?,
                last_error = ?,
                consecutive_failures = consecutive_failures + 1,
                health_status = CASE
                    WHEN consecutive_failures >= 6 THEN 'failing'
                    WHEN consecutive_failures >= 2 THEN 'degraded'
                    ELSE health_status
                END
            WHERE id = ?
        """, (now, error, source_id))
        self.conn.commit()

    def get_health_summary(self) -> dict:
        rows = self.conn.execute("""
            SELECT health_status, COUNT(*) as cnt
            FROM sources WHERE enabled = 1
            GROUP BY health_status
        """).fetchall()
        return {r["health_status"]: r["cnt"] for r in rows}
