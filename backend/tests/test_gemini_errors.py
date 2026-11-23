"""User-facing mapping for Gemini availability / quota failures."""

from __future__ import annotations

import os
import unittest
from unittest import mock

import httpx

from app.ai.gemini_errors import (
    MSG_QUOTA,
    MSG_TIMEOUT,
    MSG_UNAVAILABLE,
    analysis_error_message,
    classify_gemini_failure,
    proposal_http_error,
)
from app.core.config import _positive_float_env


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

    def test_httpx_timeout_with_empty_message_is_a_timeout(self):
        # httpx.ReadTimeout llega sin texto: solo el tipo indica el timeout.
        code, message, status = classify_gemini_failure(httpx.ReadTimeout(""))
        self.assertEqual(code, "gemini_timeout")
        self.assertEqual(status, 504)
        self.assertEqual(message, MSG_TIMEOUT)

    def test_timeout_inside_cause_is_detected(self):
        try:
            try:
                raise httpx.ConnectTimeout("")
            except httpx.ConnectTimeout as inner:
                raise RuntimeError("request failed") from inner
        except RuntimeError as exc:
            code, _, _ = classify_gemini_failure(exc)
        self.assertEqual(code, "gemini_timeout")

    def test_timeout_env_falls_back_on_invalid_values(self):
        for raw, expected in (("90", 90.0), ("abc", 600.0), ("-5", 600.0)):
            with mock.patch.dict(os.environ, {"GEMINI_TIMEOUT_SECONDS": raw}):
                self.assertEqual(
                    _positive_float_env("GEMINI_TIMEOUT_SECONDS", 600.0),
                    expected,
                )

    def test_proposal_http_uses_503(self):
        exc = _FakeServerError(503, "UNAVAILABLE high demand")
        status, detail = proposal_http_error(exc)
        self.assertEqual(status, 503)
        self.assertEqual(detail, MSG_UNAVAILABLE)


if __name__ == "__main__":
    unittest.main()
