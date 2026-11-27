import subprocess
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import MagicMock, patch

from app.ai.errors import GeminiAnalysisError
from app.services.ocr_service import ocr_pdf, ocr_sidecar_path, prefer_ocr_pdf


class TestOcrService(unittest.TestCase):
    def test_ocr_unavailable_without_binary(self):
        with TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "scan.pdf"
            pdf.write_bytes(b"%PDF-1.4")

            with patch(
                "app.services.ocr_service.shutil.which",
                return_value=None,
            ):
                with self.assertRaises(GeminiAnalysisError) as ctx:
                    ocr_pdf(str(pdf))

        self.assertEqual(ctx.exception.code, "ocr_unavailable")

    def test_ocr_failed_on_nonzero_exit(self):
        with TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "scan.pdf"
            pdf.write_bytes(b"%PDF-1.4")

            completed = MagicMock()
            completed.returncode = 1
            completed.stderr = "boom"

            with patch(
                "app.services.ocr_service.shutil.which",
                return_value="/usr/bin/ocrmypdf",
            ):
                with patch(
                    "app.services.ocr_service.subprocess.run",
                    return_value=completed,
                ):
                    with self.assertRaises(GeminiAnalysisError) as ctx:
                        ocr_pdf(str(pdf))

        self.assertEqual(ctx.exception.code, "ocr_failed")

    def test_ocr_success_uses_skip_text_by_default(self):
        with TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "scan.pdf"
            pdf.write_bytes(b"%PDF-1.4")
            expected = pdf.with_name("scan_ocr.pdf")
            captured: list[list[str]] = []

            def fake_run(command, **_kwargs):
                captured.append(list(command))
                Path(command[-1]).write_bytes(b"%PDF-1.4-ocr")
                completed = MagicMock()
                completed.returncode = 0
                completed.stderr = ""
                return completed

            with patch(
                "app.services.ocr_service.shutil.which",
                return_value="/usr/bin/ocrmypdf",
            ):
                with patch(
                    "app.services.ocr_service.OCR_FORCE_ALL",
                    False,
                ):
                    with patch(
                        "app.services.ocr_service.subprocess.run",
                        side_effect=fake_run,
                    ):
                        result = ocr_pdf(str(pdf))

            self.assertEqual(Path(result).resolve(), expected.resolve())
            self.assertTrue(expected.is_file())
            self.assertIn("--skip-text", captured[0])
            self.assertNotIn("--force-ocr", captured[0])

    def test_ocr_force_all_uses_force_ocr(self):
        with TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "scan.pdf"
            pdf.write_bytes(b"%PDF-1.4")
            captured: list[list[str]] = []

            def fake_run(command, **_kwargs):
                captured.append(list(command))
                Path(command[-1]).write_bytes(b"%PDF-1.4-ocr")
                completed = MagicMock()
                completed.returncode = 0
                completed.stderr = ""
                return completed

            with patch(
                "app.services.ocr_service.shutil.which",
                return_value="/usr/bin/ocrmypdf",
            ):
                with patch(
                    "app.services.ocr_service.OCR_FORCE_ALL",
                    True,
                ):
                    with patch(
                        "app.services.ocr_service.subprocess.run",
                        side_effect=fake_run,
                    ):
                        ocr_pdf(str(pdf))

            self.assertIn("--force-ocr", captured[0])

    def test_ocr_force_flag_uses_force_ocr(self):
        with TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "scan.pdf"
            pdf.write_bytes(b"%PDF-1.4")
            captured: list[list[str]] = []

            def fake_run(command, **_kwargs):
                captured.append(list(command))
                Path(command[-1]).write_bytes(b"%PDF-1.4-ocr")
                completed = MagicMock()
                completed.returncode = 0
                completed.stderr = ""
                return completed

            with patch(
                "app.services.ocr_service.shutil.which",
                return_value="/usr/bin/ocrmypdf",
            ):
                with patch(
                    "app.services.ocr_service.OCR_FORCE_ALL",
                    False,
                ):
                    with patch(
                        "app.services.ocr_service.subprocess.run",
                        side_effect=fake_run,
                    ):
                        ocr_pdf(str(pdf), force=True)

            self.assertIn("--force-ocr", captured[0])
            self.assertNotIn("--skip-text", captured[0])

    def test_ocr_timeout_message_includes_limit(self):
        with TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "scan.pdf"
            pdf.write_bytes(b"%PDF-1.4")

            with patch(
                "app.services.ocr_service.shutil.which",
                return_value="/usr/bin/ocrmypdf",
            ):
                with patch(
                    "app.services.ocr_service.OCR_TIMEOUT_SECONDS",
                    12,
                ):
                    with patch(
                        "app.services.ocr_service.subprocess.run",
                        side_effect=subprocess.TimeoutExpired(
                            cmd="ocrmypdf",
                            timeout=12,
                        ),
                    ):
                        with self.assertRaises(GeminiAnalysisError) as ctx:
                            ocr_pdf(str(pdf), page_count=3)

        self.assertEqual(ctx.exception.code, "ocr_timeout")
        self.assertIn("12s", ctx.exception.message)
        self.assertIn("3 páginas", ctx.exception.message)

    def test_prefer_ocr_pdf_uses_sidecar_when_present(self):
        with TemporaryDirectory() as tmp:
            source = Path(tmp) / "scan.pdf"
            source.write_bytes(b"%PDF-1.4")
            sidecar = ocr_sidecar_path(source)
            sidecar.write_bytes(b"%PDF-ocr")
            self.assertEqual(prefer_ocr_pdf(source), sidecar)


if __name__ == "__main__":
    unittest.main()
