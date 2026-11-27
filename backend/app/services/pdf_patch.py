"""Spike: patch text in-place on a source PDF (preserve images/layout).

Digital PDFs: redact text + insert_textbox.
Scanned pages (full-page raster, no text layer): white overlay + insert_textbox.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

# Near-full-page rasters are the scan background, not figures to dodge.
_SCAN_IMAGE_COVERAGE = 0.55


@dataclass(frozen=True)
class TextPatch:
    """One text replacement on a PDF page (1-based page numbers)."""

    page: int
    bbox: tuple[float, float, float, float]
    new_text: str
    font_size: float | None = None


@dataclass
class PatchResult:
    output_path: str
    applied: int = 0
    overflows: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _clear_rect(page: pymupdf.Page, rect: pymupdf.Rect) -> None:
    page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1), width=0)


def _page_area(page: pymupdf.Page) -> float:
    return abs(page.rect.width * page.rect.height) or 1.0


def page_is_scan(
    page: pymupdf.Page,
    *,
    min_coverage: float = _SCAN_IMAGE_COVERAGE,
    max_text_chars: int = 40,
) -> bool:
    """True when the page is a scanned plate (little text + dominant image)."""
    text = (page.get_text() or "").strip()
    if len(text) > max_text_chars:
        return False
    page_area = _page_area(page)
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 1:
            continue
        candidate = pymupdf.Rect(block["bbox"])
        if (candidate.width * candidate.height) / page_area >= min_coverage:
            return True
    return False


def _is_significant_obstacle(
    rect: pymupdf.Rect,
    *,
    min_side: float,
    min_area: float,
) -> bool:
    """Drop tiny fragments (circuit glyphs, hairlines) that are not figures."""
    if rect.is_empty or rect.width <= 0 or rect.height <= 0:
        return False
    if rect.width < min_side or rect.height < min_side:
        return False
    return rect.width * rect.height >= min_area


def collect_obstacle_rects(
    page: pymupdf.Page,
    *,
    min_drawing_height: float = 40.0,
    min_image_side: float = 12.0,
    min_image_area: float = 200.0,
    scan_coverage: float = _SCAN_IMAGE_COVERAGE,
) -> list[pymupdf.Rect]:
    """Image and figure-like drawing rects that patched text must not cover.

    Dense classroom PDFs often explode into hundreds of tiny image fragments
    (circuit symbols). Only keep boxes large enough to be real figures.
    Thin drawing bands (text-line glyph outlines) are ignored.
    Full-page scan backgrounds are also ignored so overlay writes are not
    clamped to nothing.
    """
    obstacles: list[pymupdf.Rect] = []
    page_area = _page_area(page)
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 1:
            continue
        candidate = pymupdf.Rect(block["bbox"])
        if (candidate.width * candidate.height) / page_area >= scan_coverage:
            continue
        if _is_significant_obstacle(
            candidate,
            min_side=min_image_side,
            min_area=min_image_area,
        ):
            obstacles.append(candidate)
    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if rect is None:
            continue
        candidate = pymupdf.Rect(rect)
        if candidate.height < min_drawing_height:
            continue
        if (candidate.width * candidate.height) / page_area >= scan_coverage:
            continue
        if not _is_significant_obstacle(
            candidate,
            min_side=min_image_side,
            min_area=min_image_area,
        ):
            continue
        obstacles.append(candidate)
    return obstacles


def clamp_rect_away_from_obstacles(
    rect: pymupdf.Rect,
    obstacles: list[pymupdf.Rect],
    *,
    padding: float = 4.0,
    page_bound: pymupdf.Rect | None = None,
) -> pymupdf.Rect:
    """Shrink a write box so it does not invade nearby figures.

    - Side-by-side: vertically overlapping obstacles to the right/left cap
      ``x1`` / ``x0``.
    - Below: horizontally overlapping obstacles below the text top cap ``y1``.
    """
    clamped = pymupdf.Rect(rect)
    if page_bound is not None:
        clamped = clamped & page_bound
        if clamped.is_empty:
            return pymupdf.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + 12)

    # Pass 1: figures below — shrink height before judging side collisions.
    for obs in obstacles:
        horizontally_overlaps = not (
            clamped.x1 <= obs.x0 + padding or obs.x1 <= clamped.x0 + padding
        )
        if not horizontally_overlaps:
            continue
        if obs.y0 >= clamped.y0 and obs.y0 < clamped.y1:
            clamped.y1 = min(clamped.y1, obs.y0 - padding)

    # Pass 2: figures beside — only against the already height-clamped box.
    for obs in obstacles:
        vertically_overlaps = not (
            clamped.y1 <= obs.y0 + padding or obs.y1 <= clamped.y0 + padding
        )
        if not vertically_overlaps:
            continue
        if obs.x0 >= clamped.x0 and obs.x0 < clamped.x1:
            clamped.x1 = min(clamped.x1, obs.x0 - padding)
        if obs.x1 <= clamped.x1 and obs.x1 > clamped.x0:
            clamped.x0 = max(clamped.x0, obs.x1 + padding)

    min_height = 10.0
    min_width = 24.0
    if clamped.y1 < clamped.y0 + min_height:
        clamped.y1 = clamped.y0 + min_height
    if clamped.x1 < clamped.x0 + min_width:
        clamped.x1 = clamped.x0 + min_width
    return clamped


def _fit_textbox(
    page: pymupdf.Page,
    rect: pymupdf.Rect,
    text: str,
    *,
    start_fontsize: float,
    fontname: str = "helv",
    obstacles: list[pymupdf.Rect] | None = None,
) -> tuple[bool, float, pymupdf.Rect]:
    """Try insert_textbox, shrinking font and slightly growing height.

    Returns ``(ok, fontsize_used, rect_used)``. Failed attempts clear the
    write rect so partial writes do not stack. Growth is clamped so text
    does not cover nearby figures.
    """
    obstacles = obstacles or []
    page_bound = pymupdf.Rect(
        page.rect.x0 + 36,
        page.rect.y0 + 36,
        page.rect.x1 - 36,
        page.rect.y1 - 36,
    )
    write_rect = clamp_rect_away_from_obstacles(
        rect,
        obstacles,
        page_bound=page_bound,
    )
    fontsize = start_fontsize
    min_size = 6.0
    grew = False

    while True:
        while fontsize >= min_size:
            _clear_rect(page, write_rect)
            rc = page.insert_textbox(
                pymupdf.Rect(write_rect),
                text,
                fontname=fontname,
                fontsize=fontsize,
                align=pymupdf.TEXT_ALIGN_LEFT,
            )
            # PyMuPDF: >= 0 leftover unused height (success); < 0 overflow.
            if rc >= 0:
                return True, fontsize, write_rect
            fontsize -= 0.5

        if grew:
            _clear_rect(page, write_rect)
            page.insert_textbox(
                pymupdf.Rect(write_rect),
                text,
                fontname=fontname,
                fontsize=min_size,
                align=pymupdf.TEXT_ALIGN_LEFT,
            )
            return False, min_size, write_rect

        # One growth pass: more height for wrapped lines, stay clear of figures.
        grew = True
        extra = max(write_rect.height * 0.75, 28.0)
        candidate = pymupdf.Rect(
            write_rect.x0,
            write_rect.y0,
            write_rect.x1,
            write_rect.y1 + extra,
        )
        write_rect = clamp_rect_away_from_obstacles(
            candidate,
            obstacles,
            page_bound=page_bound,
        )
        fontsize = start_fontsize


def patch_pdf(
    source_path: str | Path,
    patches: list[TextPatch],
    output_path: str | Path,
) -> PatchResult:
    source = Path(source_path)
    output = Path(output_path)
    if not source.is_file():
        raise FileNotFoundError(source)

    result = PatchResult(output_path=str(output))
    doc = pymupdf.open(str(source))
    try:
        # Digital pages: redact then write. Scan pages: white overlay + write
        # (redaction cannot erase text baked into the page raster).
        pending_writes: list[
            tuple[int, pymupdf.Rect, str, float, list[pymupdf.Rect], bool]
        ] = []
        pages_needing_redact: set[int] = set()

        for patch in patches:
            page_index = patch.page - 1
            if page_index < 0 or page_index >= doc.page_count:
                result.warnings.append(
                    f"page {patch.page} out of range for {source.name}"
                )
                continue

            page = doc[page_index]
            scan_page = page_is_scan(page)
            obstacles = collect_obstacle_rects(page)
            requested = pymupdf.Rect(patch.bbox)
            rect = clamp_rect_away_from_obstacles(
                requested,
                obstacles,
                page_bound=page.rect,
            )
            if rect.is_empty or rect.width <= 0 or rect.height <= 0:
                result.warnings.append(
                    f"empty bbox on page {patch.page}: {patch.bbox}"
                )
                continue
            if (
                abs(rect.y1 - requested.y1) > 0.5
                or abs(rect.x1 - requested.x1) > 0.5
                or abs(rect.x0 - requested.x0) > 0.5
            ):
                result.warnings.append(
                    f"page {patch.page}: write box clamped to avoid figures"
                )

            if scan_page:
                result.warnings.append(
                    f"page {patch.page}: scan overlay "
                    "(no text layer; painted over image)"
                )
            else:
                # Cover original text; keep drawings/images outside the rect.
                page.add_redact_annot(rect, fill=(1, 1, 1))
                pages_needing_redact.add(page_index)

            start_size = patch.font_size or 11.0
            pending_writes.append(
                (
                    page_index,
                    rect,
                    patch.new_text,
                    start_size,
                    obstacles,
                    scan_page,
                )
            )

        for page_index in sorted(pages_needing_redact):
            page = doc[page_index]
            # Never remove or blank images that intersect the redact area.
            page.apply_redactions(
                images=pymupdf.PDF_REDACT_IMAGE_NONE,
                graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
            )

        for (
            page_index,
            rect,
            text,
            start_size,
            obstacles,
            scan_page,
        ) in pending_writes:
            page = doc[page_index]
            # Overlay path: _fit_textbox white-clears the rect before writing,
            # covering scanned glyphs while leaving the page raster elsewhere.
            ok, used_size, used_rect = _fit_textbox(
                page,
                rect,
                text,
                start_fontsize=start_size,
                obstacles=obstacles,
            )
            if ok:
                result.applied += 1
                if used_size + 0.01 < start_size:
                    result.warnings.append(
                        f"page {page_index + 1}: shrunk font "
                        f"{start_size:.1f}→{used_size:.1f} to fit bbox"
                    )
                if used_rect.height > rect.height + 1:
                    result.warnings.append(
                        f"page {page_index + 1}: expanded text box height "
                        f"to fit longer adaptation"
                    )
            else:
                result.overflows.append(
                    f"page {page_index + 1}: text did not fit bbox "
                    f"{tuple(used_rect)}"
                )
                result.applied += 1

        output.parent.mkdir(parents=True, exist_ok=True)
        if output.exists():
            output.unlink()
        doc.save(str(output), garbage=3, deflate=True)
    finally:
        doc.close()

    return result


def _make_raster_pixmap(width: int = 96, height: int = 72) -> pymupdf.Pixmap:
    """Solid orange pixmap used as an embedded raster stand-in."""
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, width, height))
    pix.set_rect(pix.irect, (255, 120, 40))
    return pix


def count_page_images(pdf_path: str | Path, *, page: int = 1) -> int:
    doc = pymupdf.open(str(pdf_path))
    try:
        page_index = page - 1
        if page_index < 0 or page_index >= doc.page_count:
            return 0
        return len(doc[page_index].get_images(full=True))
    finally:
        doc.close()


def build_spike_sample_pdf(
    output_path: str | Path,
    *,
    with_raster: bool = False,
) -> Path:
    """Create a tiny PDF with body text + figure stand-in.

    When ``with_raster`` is true, embeds a real pixmap image (not only a
    vector rectangle) so patch tests can assert image xrefs survive.
    """
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open()
    try:
        page = doc.new_page(width=595, height=842)  # A4-ish points

        page.insert_text(
            (72, 72),
            "Material de prueba VERA",
            fontsize=16,
            fontname="helv",
        )
        page.insert_text(
            (72, 110),
            "SECADO ARTIFICIAL: Este es uno de los metodos mas utilizados "
            "actualmente por su rapidez.",
            fontsize=11,
            fontname="helv",
        )

        image_rect = pymupdf.Rect(72, 200, 320, 360)
        if with_raster:
            pix = _make_raster_pixmap()
            try:
                page.insert_image(image_rect, pixmap=pix)
            finally:
                pix = None
            caption = "Figura 1. Esquema del horno (imagen raster embebida)."
        else:
            page.draw_rect(
                image_rect,
                color=(0.15, 0.35, 0.7),
                fill=(0.15, 0.35, 0.7),
            )
            caption = "Figura 1. Esquema del horno (bloque azul = imagen)."
        page.insert_text((72, 380), caption, fontsize=10, fontname="helv")

        if output.exists():
            output.unlink()
        doc.save(str(output))
    finally:
        doc.close()

    return output


def find_text_bbox(
    pdf_path: str | Path,
    needle: str,
    *,
    page: int = 1,
) -> tuple[float, float, float, float] | None:
    """Return the first search hit bbox for needle on the given page."""
    doc = pymupdf.open(str(pdf_path))
    try:
        page_index = page - 1
        if page_index < 0 or page_index >= doc.page_count:
            return None
        hits = doc[page_index].search_for(needle)
        if not hits:
            return None
        rect = hits[0]
        return (rect.x0, rect.y0, rect.x1, rect.y1)
    finally:
        doc.close()


def _expand_bbox(
    bbox: list[float] | tuple[float, float, float, float],
    *,
    new_text: str = "",
    page_width: float = 595.0,
) -> tuple[float, float, float, float]:
    x0, y0, x1, y1 = (
        float(bbox[0]),
        float(bbox[1]),
        float(bbox[2]),
        float(bbox[3]),
    )
    height = max(y1 - y0, 12.0)
    target_right = min(page_width - 36.0, max(x1, x0 + 420.0))
    avail_width = max(target_right - x0, 40.0)
    # Rough wrap estimate at ~6.2pt per character for 11pt Helvetica.
    chars_per_line = max(int(avail_width / 6.2), 12)
    lines = max(1, (len(new_text) + chars_per_line - 1) // chars_per_line)
    needed_height = max(height + 20.0, lines * height * 1.2, lines * 14.0)
    return (
        x0,
        max(0.0, y0 - 2.0),
        target_right,
        y0 + needed_height,
    )


@dataclass(frozen=True)
class BBoxQuality:
    """OCR/canonical bbox sanity check before patching."""

    ok: bool
    code: str
    detail: str = ""


def assess_bbox_quality(
    bbox: list[float] | tuple[float, float, float, float],
    *,
    page_rect: pymupdf.Rect | None = None,
    is_scan: bool = False,
) -> BBoxQuality:
    """Return whether a bbox is safe to patch (esp. on scanned pages)."""
    from app.core.config import (
        BBOX_MAX_PAGE_COVERAGE,
        BBOX_SCAN_IMPRECISE_COVERAGE,
        BBOX_SCAN_MIN_AREA,
        BBOX_SCAN_REJECT_COVERAGE,
    )

    try:
        x0, y0, x1, y1 = (float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3]))
    except (TypeError, ValueError, IndexError):
        return BBoxQuality(False, "degenerate", "unreadable bbox")

    width = x1 - x0
    height = y1 - y0
    if width < 8.0 or height < 6.0:
        return BBoxQuality(False, "degenerate", f"size {width:.1f}x{height:.1f}")

    area = width * height
    if page_rect is not None:
        page_area = abs(page_rect.width * page_rect.height) or 1.0
        inter = pymupdf.Rect(x0, y0, x1, y1) & page_rect
        if inter.is_empty or (inter.width * inter.height) < area * 0.5:
            return BBoxQuality(False, "out_of_page", "bbox mostly outside page")

        coverage = area / page_area
        # Whole-page OCR boxes would white-out a scan plate.
        if coverage >= BBOX_MAX_PAGE_COVERAGE:
            return BBoxQuality(
                False,
                "too_large",
                f"covers {coverage:.0%} of page",
            )
        # Half-page OCR regions on scans → appendix instead of coarse overlay.
        if is_scan and coverage >= BBOX_SCAN_REJECT_COVERAGE:
            return BBoxQuality(
                False,
                "too_large",
                f"scan region covers {coverage:.0%} of page",
            )
        if is_scan and coverage >= BBOX_SCAN_IMPRECISE_COVERAGE:
            return BBoxQuality(
                True,
                "imprecise_ocr",
                f"large scan region ({coverage:.0%}); overlay may be coarse",
            )
        if is_scan and area < BBOX_SCAN_MIN_AREA:
            return BBoxQuality(
                True,
                "imprecise_ocr",
                f"tiny scan region area={area:.0f}",
            )

    return BBoxQuality(True, "ok")


def build_patches_for_replacements(
    document: dict,
    replacements: dict[str, str],
    *,
    source_path: str | Path | None = None,
) -> tuple[list[TextPatch], list[str], dict[str, str]]:
    """Map element_id → proposed text into TextPatch using canonical bboxes.

    Returns ``(patches, technical_warnings, skipped)`` where ``skipped`` maps
    ``element_id → reason`` for replacements that must go to the appendix.
    """
    patches: list[TextPatch] = []
    warnings: list[str] = []
    skipped: dict[str, str] = {}
    patched_ids: set[str] = set()
    if not replacements:
        return patches, warnings, skipped

    page_meta: dict[int, tuple[pymupdf.Rect | None, bool]] = {}
    source_doc: pymupdf.Document | None = None
    if source_path is not None:
        path = Path(source_path)
        if path.is_file():
            source_doc = pymupdf.open(str(path))

    try:
        for page in document.get("pages", []):
            page_number = int(page.get("page_number") or 0)
            for element in page.get("elements", []):
                element_id = element.get("element_id")
                if not element_id or element_id not in replacements:
                    continue
                bbox = element.get("bbox")
                if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
                    reason = "missing bbox"
                    warnings.append(
                        f"element {element_id}: {reason}; skipped for patch"
                    )
                    skipped[element_id] = reason
                    continue
                element_page = int(element.get("page") or page_number or 1)
                if element_page < 1:
                    reason = "invalid page"
                    warnings.append(
                        f"element {element_id}: {reason}; skipped for patch"
                    )
                    skipped[element_id] = reason
                    continue

                page_rect: pymupdf.Rect | None = None
                is_scan = False
                if source_doc is not None and 0 < element_page <= source_doc.page_count:
                    if element_page not in page_meta:
                        src_page = source_doc[element_page - 1]
                        page_meta[element_page] = (
                            src_page.rect,
                            page_is_scan(src_page),
                        )
                    page_rect, is_scan = page_meta[element_page]

                quality = assess_bbox_quality(
                    bbox,
                    page_rect=page_rect,
                    is_scan=is_scan,
                )
                if not quality.ok:
                    reason = f"bbox quality {quality.code}"
                    warnings.append(
                        f"element {element_id}: {reason}"
                        f" ({quality.detail}); skipped for patch"
                    )
                    skipped[element_id] = reason
                    continue
                if quality.code == "imprecise_ocr":
                    warnings.append(
                        f"element {element_id}: imprecise OCR bbox "
                        f"({quality.detail})"
                    )

                font_size = element.get("_font_size")
                if not isinstance(font_size, (int, float)) or font_size <= 0:
                    font_size = 11.0
                new_text = replacements[element_id]
                page_width = float(page_rect.width) if page_rect else 595.0
                patches.append(
                    TextPatch(
                        page=element_page,
                        bbox=_expand_bbox(
                            bbox,
                            new_text=new_text,
                            page_width=page_width,
                        ),
                        new_text=new_text,
                        font_size=float(font_size),
                    )
                )
                patched_ids.add(element_id)

        for element_id in sorted(set(replacements) - patched_ids - set(skipped)):
            reason = "not patchable from canonical document"
            warnings.append(f"element {element_id}: {reason}")
            skipped[element_id] = reason
    finally:
        if source_doc is not None:
            source_doc.close()

    return patches, warnings, skipped


def append_appendix_pages(
    pdf_path: str | Path,
    appendix: list[dict[str, str]],
) -> None:
    """Append plain-text appendix pages for adaptations that could not be patched."""
    if not appendix:
        return
    path = Path(pdf_path)
    tmp = path.with_suffix(".appendix.tmp.pdf")
    doc = pymupdf.open(str(path))
    try:
        for item in appendix:
            page = doc.new_page()
            title = f"Adaptación: {item.get('title') or 'Sin título'}"
            body = item.get("content") or ""
            page.insert_text((72, 72), title, fontsize=14, fontname="helv")
            page.insert_textbox(
                pymupdf.Rect(72, 100, 523, 770),
                body,
                fontsize=11,
                fontname="helv",
                align=pymupdf.TEXT_ALIGN_LEFT,
            )
        if tmp.exists():
            tmp.unlink()
        doc.save(str(tmp), garbage=3, deflate=True)
    finally:
        doc.close()
    path.unlink(missing_ok=True)
    tmp.rename(path)
