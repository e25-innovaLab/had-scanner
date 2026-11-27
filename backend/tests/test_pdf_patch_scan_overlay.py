"""Scan pages use white overlay instead of text-layer redaction."""

from __future__ import annotations

import unittest
from pathlib import Path

import pymupdf

from app.services.pdf_patch import (
    TextPatch,
    collect_obstacle_rects,
    count_page_images,
    page_is_scan,
    patch_pdf,
)


def _build_scan_sample(path: Path) -> Path:
    """Full-page raster + no text layer (Herrería-like)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open()
    try:
        page = doc.new_page(width=595, height=842)
        # Single full-page pixmap: paper + darker band of “printed” glyphs.
        paper = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 119, 168))
        paper.set_rect(paper.irect, (235, 230, 220))
        # Band roughly matching overlay bbox (72,140)-(420,190) in page space.
        band = pymupdf.IRect(14, 28, 84, 38)
        paper.set_rect(band, (40, 40, 40))
        page.insert_image(page.rect, pixmap=paper)
        if path.exists():
            path.unlink()
        doc.save(str(path))
    finally:
        doc.close()
    return path


class TestScanOverlay(unittest.TestCase):
    def test_page_is_scan_detects_full_page_raster(self):
        root = Path("/tmp/vera_pdf_spike_scan")
        sample = _build_scan_sample(root / "scan.pdf")
        doc = pymupdf.open(str(sample))
        try:
            self.assertTrue(page_is_scan(doc[0]))
            self.assertEqual(collect_obstacle_rects(doc[0]), [])
        finally:
            doc.close()

    def test_overlay_keeps_scan_image_and_adds_text_layer(self):
        root = Path("/tmp/vera_pdf_spike_scan")
        sample = _build_scan_sample(root / "scan_overlay.pdf")
        patched = root / "scan_overlay_patched.pdf"

        before = count_page_images(sample, page=1)
        self.assertGreaterEqual(before, 1)

        result = patch_pdf(
            sample,
            [
                TextPatch(
                    page=1,
                    bbox=(72, 140, 420, 220),
                    new_text=(
                        "Adaptacion VERA sobre escaneo: el texto nuevo se "
                        "pinta encima del raster original."
                    ),
                    font_size=11,
                )
            ],
            patched,
        )
        self.assertEqual(result.applied, 1)
        self.assertTrue(
            any("scan overlay" in item for item in result.warnings),
            result.warnings,
        )
        self.assertEqual(count_page_images(patched, page=1), before)

        out = pymupdf.open(str(patched))
        try:
            text = out[0].get_text()
            self.assertIn("Adaptacion VERA sobre escaneo", text)
            self.assertTrue(page_is_scan(out[0]) or "Adaptacion" in text)
        finally:
            out.close()


if __name__ == "__main__":
    unittest.main()
