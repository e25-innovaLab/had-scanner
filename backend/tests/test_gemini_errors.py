"""User-facing mapping for Gemini availability / quota failures."""

from __future__ import annotations

import unittest

from app.ai.gemini_errors import (
    MSG_QUOTA,
    MSG_UNAVAILABLE,
    analysis_error_message,
    classify_gemini_failure,
    proposal_http_error,
)


class _FakeServerError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


class TestGeminiErrors(unittest.TestCase):
    def test_503_high_demand(self):
        exc = _FakeServerError(
            503,
            "503 UNAVAILABLE. This model is currently experiencing high demand.",
        )
        code, message, status = classify_gemini_failure(exc)
        self.assertEqual(code, "gemini_unavailable")
        self.assertEqual(status, 503)
        self.assertEqual(message, MSG_UNAVAILABLE)
        self.assertIn("Gemini", analysis_error_message(exc))

    def test_quota(self):
        exc = _FakeServerError(
            429,
            "RESOURCE_EXHAUSTED: You exceeded your current quota.",
        )
        code, message, status = classify_gemini_failure(exc)
        self.assertEqual(code, "gemini_quota")
        self.assertEqual(status, 429)
        self.assertEqual(message, MSG_QUOTA)

    def test_proposal_http_uses_503(self):
        exc = _FakeServerError(503, "UNAVAILABLE high demand")
        status, detail = proposal_http_error(exc)
        self.assertEqual(status, 503)
        self.assertEqual(detail, MSG_UNAVAILABLE)


if __name__ == "__main__":
    unittest.main()
