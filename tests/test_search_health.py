import unittest
from unittest.mock import patch, MagicMock
from pipeline.search.health_check import check_searxng_health, ProviderHealth


class TestSearchHealth(unittest.TestCase):
    @patch("pipeline.search.health_check.requests")
    def test_healthy_when_responding(self, mock_requests):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.elapsed.total_seconds.return_value = 0.5
        mock_requests.get.return_value = mock_resp
        health = check_searxng_health("http://localhost:8080")
        self.assertEqual(health.status, "healthy")

    @patch("pipeline.search.health_check.requests")
    def test_unavailable_when_timeout(self, mock_requests):
        mock_requests.get.side_effect = Exception("timeout")
        health = check_searxng_health("http://localhost:8080")
        self.assertEqual(health.status, "unavailable")

    @patch("pipeline.search.health_check.requests")
    def test_degraded_when_slow(self, mock_requests):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.elapsed.total_seconds.return_value = 12.0
        mock_requests.get.return_value = mock_resp
        health = check_searxng_health("http://localhost:8080", timeout_sec=8)
        self.assertEqual(health.status, "degraded")

    @patch("pipeline.search.health_check.requests")
    def test_unavailable_when_error_status(self, mock_requests):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.elapsed.total_seconds.return_value = 0.5
        mock_requests.get.return_value = mock_resp
        health = check_searxng_health("http://localhost:8080")
        self.assertEqual(health.status, "unavailable")


if __name__ == "__main__":
    unittest.main()
