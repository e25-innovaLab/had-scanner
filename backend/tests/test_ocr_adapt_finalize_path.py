"""Adapt/finalize should resolve to the OCR working PDF when present."""

from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from app.services.ocr_service import resolve_analyzed_pdf_path


class TestOcrAdaptFinalizePath(unittest.TestCase):
    def test_resolve_prefers_sibling_ocr_for_adapt_finalize(self):
        with TemporaryDirectory() as tmp:
            original = Path(tmp) / "scan.pdf"
            ocr = Path(tmp) / "scan_ocr.pdf"
            original.write_bytes(b"%PDF-orig")
            ocr.write_bytes(b"%PDF-ocr")
            self.assertEqual(
                resolve_analyzed_pdf_path(str(original)),
                ocr,
            )

    def test_resolve_prefers_durable_ocr_when_no_sibling(self):
        with TemporaryDirectory() as tmp:
            original = Path(tmp) / "scan.pdf"
            original.write_bytes(b"%PDF-orig")
            durable = Path(tmp) / "ocr" / "scan_ocr.pdf"
            durable.parent.mkdir()
            durable.write_bytes(b"%PDF-ocr")
            with patch(
                "app.services.ocr_service.STORAGE_DIR",
                Path(tmp),
            ):
                self.assertEqual(
                    resolve_analyzed_pdf_path(str(original)),
                    durable,
                )


if __name__ == "__main__":
    unittest.main()
