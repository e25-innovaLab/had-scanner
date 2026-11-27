"""Collision clamping keeps expanded text boxes off figures."""

from __future__ import annotations

import unittest
from pathlib import Path

import pymupdf

from app.services.pdf_patch import (
    TextPatch,
    clamp_rect_away_from_obstacles,
    collect_obstacle_rects,
    count_page_images,
    find_text_bbox,
    patch_pdf,
)


class TestCollisionClamp(unittest.TestCase):
    def test_clamp_stops_above_obstacle(self):
        text = pymupdf.Rect(72, 100, 400, 300)
        figure = pymupdf.Rect(72, 200, 320, 360)
        clamped = clamp_rect_away_from_obstacles(text, [figure], padding=4)
        self.assertLessEqual(clamped.y1, figure.y0 - 4 + 0.01)

    def test_clamp_stops_left_of_side_figure(self):
        text = pymupdf.Rect(56, 60, 520, 120)
        figure = pymupdf.Rect(382, 33, 530, 200)
        clamped = clamp_rect_away_from_obstacles(text, [figure], padding=4)
        self.assertLessEqual(clamped.x1, figure.x0 - 4 + 0.01)
        self.assertGreater(clamped.width, 20)

    def test_figure_below_does_not_side_clamp_width(self):
        text = pymupdf.Rect(85, 148, 520, 400)
        figure = pymupdf.Rect(131, 323, 284, 425)
        clamped = clamp_rect_away_from_obstacles(text, [figure], padding=4)
        self.assertLessEqual(clamped.y1, figure.y0 - 4 + 0.01)
        self.assertGreater(clamped.width, 300)

    def test_collect_obstacles_ignores_tiny_image_fragments(self):
        root = Path("/tmp/vera_pdf_spike_collision")
        root.mkdir(parents=True, exist_ok=True)
        sample = root / "dense_fragments.pdf"

        doc = pymupdf.open()
        try:
            page = doc.new_page(width=595, height=842)
            big = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 80, 60))
            big.set_rect(big.irect, (20, 160, 220))
            page.insert_image(pymupdf.Rect(380, 40, 520, 180), pixmap=big)
            tiny = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 4, 4))
            tiny.set_rect(tiny.irect, (200, 40, 40))
            for i in range(12):
                x = 60 + i * 8
                page.insert_image(pymupdf.Rect(x, 300, x + 4, 304), pixmap=tiny)
            doc.save(str(sample))
        finally:
            doc.close()

        src = pymupdf.open(str(sample))
        try:
            obstacles = collect_obstacle_rects(src[0])
        finally:
            src.close()

        self.assertEqual(len(obstacles), 1)
        self.assertGreaterEqual(obstacles[0].width, 100)

    def test_synthetic_pdf_keeps_raster_below_text(self):
        root = Path("/tmp/vera_pdf_spike_collision")
        root.mkdir(parents=True, exist_ok=True)
        sample = root / "sample.pdf"
        patched = root / "patched.pdf"

        doc = pymupdf.open()
        try:
            page = doc.new_page(width=595, height=842)
            page.insert_text(
                (72, 120),
                "Parrafo original corto sobre una figura.",
                fontsize=11,
                fontname="helv",
            )
            pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 80, 60))
            pix.set_rect(pix.irect, (20, 160, 220))
            page.insert_image(pymupdf.Rect(72, 200, 280, 340), pixmap=pix)
            doc.save(str(sample))
        finally:
            doc.close()

        before = count_page_images(sample, page=1)
        self.assertEqual(before, 1)

        needle = "Parrafo original corto sobre una figura."
        bbox = find_text_bbox(sample, needle, page=1)
        self.assertIsNotNone(bbox)
        assert bbox is not None
        x0, y0, x1, y1 = bbox
        # Aggressive expansion that would cover the image without clamping.
        aggressive = (x0, y0 - 2, 520, 330)

        result = patch_pdf(
            sample,
            [
                TextPatch(
                    page=1,
                    bbox=aggressive,
                    new_text=(
                        "Parrafo adaptado mucho mas largo para forzar el "
                        "crecimiento de la caja de texto hacia la figura "
                        "inferior y comprobar que el clamp la detiene."
                    ),
                    font_size=11,
                )
            ],
            patched,
        )
        self.assertEqual(result.applied, 1)
        self.assertEqual(count_page_images(patched, page=1), before)
        self.assertTrue(
            any("clamped" in item for item in result.warnings),
            result.warnings,
        )

        out = pymupdf.open(str(patched))
        try:
            obstacles = collect_obstacle_rects(out[0])
            self.assertTrue(obstacles)
            # Image block should still exist around y≈200.
            image_blocks = [
                block
                for block in out[0].get_text("dict")["blocks"]
                if block.get("type") == 1
            ]
            self.assertGreaterEqual(len(image_blocks), 1)
            self.assertGreaterEqual(image_blocks[0]["bbox"][1], 190)
        finally:
            out.close()


if __name__ == "__main__":
    unittest.main()
