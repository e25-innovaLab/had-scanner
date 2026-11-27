"""Smoke tests for the PDF in-place patch spike."""

from __future__ import annotations

import unittest
from pathlib import Path

import pymupdf

from app.services.pdf_patch import (
    TextPatch,
    build_spike_sample_pdf,
    find_text_bbox,
    patch_pdf,
)


class TestPdfPatchSpike(unittest.TestCase):
    def test_demo_preserves_figure_block_and_replaces_text(self):
        root = Path("/tmp/vera_pdf_spike_test")
        root.mkdir(parents=True, exist_ok=True)
        sample = root / "sample.pdf"
        patched = root / "patched.pdf"

        build_spike_sample_pdf(sample)
        needle = (
            "SECADO ARTIFICIAL: Este es uno de los metodos mas utilizados "
            "actualmente por su rapidez."
        )
        bbox = find_text_bbox(sample, needle, page=1)
        self.assertIsNotNone(bbox)
        assert bbox is not None
        x0, y0, x1, y1 = bbox
        wide = (x0, y0 - 2, max(x1, 520), y1 + 36)

        replacement = (
            "SECADO ARTIFICIAL: Metodo rapido con horno, humedad y ventilacion."
        )
        result = patch_pdf(
            sample,
            [TextPatch(page=1, bbox=wide, new_text=replacement, font_size=11)],
            patched,
        )
        self.assertEqual(result.applied, 1)
        self.assertTrue(patched.is_file())

        doc = pymupdf.open(str(patched))
        try:
            text = doc[0].get_text()
            self.assertIn("Metodo rapido", text)
            self.assertNotIn("actualmente por su rapidez", text)
            # Filled blue rect should still be present as a drawing.
            drawings = doc[0].get_drawings()
            filled = [
                d
                for d in drawings
                if d.get("fill") is not None
                and abs((d.get("rect") or pymupdf.Rect()).y0 - 200) < 5
            ]
            self.assertTrue(filled, "expected figure rectangle to survive patch")
        finally:
            doc.close()


if __name__ == "__main__":
    unittest.main()
