
import json
from typing import Any
import pymupdf4llm
import re
from collections import Counter

TEXT_TYPES = {"text"}
IMAGE_TYPES = {"picture"}

# Lo siguiente devuelve exáctamente el analisis de pymupdf4llm
# def extract_document(file_path: str) -> dict:
#     document_json = pymupdf4llm.to_json(file_path)
#     return json.loads(document_json)

def _extract_text(box: dict[str, Any]) -> str:
    """Extract text while preserving spaces between spans."""
    lines = []

    for textline in box.get("textlines", []):
        spans = textline.get("spans", [])
        line = "".join(span.get("text", "") for span in spans).strip()

        if line:
            lines.append(line)

    return " ".join(lines).strip()


def _font_size(box: dict[str, Any]) -> float | None:
    sizes = [
        float(span["size"])
        for line in box.get("textlines", [])
        for span in line.get("spans", [])
        if isinstance(span.get("size"), (int, float))
        and span["size"] > 0
    ]

    if not sizes:
        return None

    sizes.sort()
    return sizes[len(sizes) // 2]


def _line_height(box: dict[str, Any]) -> float:
    heights = []

    for line in box.get("textlines", []):
        bbox = line.get("bbox")

        if bbox and len(bbox) == 4:
            height = bbox[3] - bbox[1]

            if height > 0:
                heights.append(height)

    return sum(heights) / len(heights) if heights else 10.0


def _make_element(
    box: dict[str, Any],
    page_number: int,
    body_font_size: float,
) -> dict[str, Any]:
    box_type = box.get("boxclass", "text")
    text = _extract_text(box)
    font_info = _get_font_info(box)

    # Clasificar el elemento según su contenido y formato.
    classified_type, heading_level = _classify_element(
        box,
        text,
        font_info,
        body_font_size,
    )

    element: dict[str, Any] = {
        "type": classified_type,
        "page": page_number,
        "bbox": [
            box.get("x0", 0),
            box.get("y0", 0),
            box.get("x1", 0),
            box.get("y1", 0),
        ],
    }

    if text:
        element["text"] = text

    if heading_level is not None:
        element["heading_level"] = heading_level

    # Estos campos se utilizan internamente para reconstruir el texto.
    element["_font_size"] = _font_size(box)
    element["_line_height"] = _line_height(box)

    return element


def _can_merge(
    previous: dict[str, Any],
    current: dict[str, Any],
) -> bool:
    """Identify likely continuations of the same paragraph."""

    if previous["type"] != "text" or current["type"] != "text":
        return False

    if previous["page"] != current["page"]:
        return False

    if previous["_font_size"] is None or current["_font_size"] is None:
        return False

    if abs(previous["_font_size"] - current["_font_size"]) > 0.8:
        return False

    px0, py0, px1, py1 = previous["bbox"]
    cx0, cy0, cx1, cy1 = current["bbox"]

    vertical_gap = cy0 - py1

    max_gap = max(
        18.0,
        2.2 * max(
            previous["_line_height"],
            current["_line_height"],
        ),
    )

    if vertical_gap < -2 or vertical_gap > max_gap:
        return False

    previous_text = previous.get("text", "").rstrip()
    current_text = current.get("text", "").lstrip()

    # Do not merge after a likely sentence or paragraph ending.
    if previous_text.endswith((".", "!", "?", ":", ";")):
        return False

    # A continuation commonly starts with lowercase text,
    # as in "...como componentes" followed by "y estados...".
    if not current_text or not current_text[0].islower():
        return False

    previous_width = px1 - px0
    current_width = cx1 - cx0

    # Normal case: similar horizontal alignment and width.
    same_layout = (
        abs(px0 - cx0) <= 12
        and abs(previous_width - current_width) <= 30
    )

    # Wrapped paragraph: text starts beside an image and
    # continues below it with a wider line.
    wrapped_layout = (
        cx0 < px0 - 30
        and current_width > previous_width + 80
        and cx1 >= px1 - 15
    )

    return same_layout or wrapped_layout or (
        # Also allow a clear textual continuation when the
        # layout changes, provided the vertical gap is small.
        vertical_gap <= max(
            12.0,
            1.5 * max(
                previous["_line_height"],
                current["_line_height"],
            ),
        )
    )


def _merge_text(
    previous: dict[str, Any],
    current: dict[str, Any],
) -> dict[str, Any]:
    previous["text"] = (
        previous.get("text", "") + " " + current.get("text", "")
    ).strip()

    previous["bbox"] = [
        min(previous["bbox"][0], current["bbox"][0]),
        min(previous["bbox"][1], current["bbox"][1]),
        max(previous["bbox"][2], current["bbox"][2]),
        max(previous["bbox"][3], current["bbox"][3]),
    ]

    previous["_line_height"] = max(
        previous.get("_line_height", 0),
        current.get("_line_height", 0),
    )

    return previous


def _overlaps(a: list, b: list) -> bool:
    """Check whether two bounding boxes overlap."""
    return (
        a[0] < b[2]
        and a[2] > b[0]
        and a[1] < b[3]
        and a[3] > b[1]
    )


def _reconstruct_page(
    page: dict[str, Any],
    body_font_size: float,
) -> list[dict[str, Any]]:
    page_number = page.get("page_number", 1)
    boxes = page.get("boxes", [])

    text_elements: list[dict[str, Any]] = []
    picture_elements: list[dict[str, Any]] = []

    # Clasificar los elementos iniciales y separar las imágenes.
    for box in boxes:
        element = _make_element(
            box,
            page_number,
            body_font_size,
        )

        if element["type"] == "picture":
            picture_elements.append(element)
        else:
            text_elements.append(element)

    # Reconstruir párrafos a partir de bloques de texto compatibles.
    reconstructed: list[dict[str, Any]] = []

    for element in text_elements:
        if (
            reconstructed
            and isinstance(reconstructed[-1], dict)
            and isinstance(element, dict)
            and reconstructed[-1].get("type") == "text"
            and element.get("type") == "text"
            and _can_merge(reconstructed[-1], element)
        ):
            merged_element = _merge_text(reconstructed[-1], element)

            if merged_element is not None:
                reconstructed[-1] = merged_element
            else:
                reconstructed.append(element)
        else:
            reconstructed.append(element)

    # Reincorporar imágenes sin interrumpir la reconstrucción del texto.
    for picture in picture_elements:
        picture_bbox = picture["bbox"]
        inserted = False

        for index, element in enumerate(reconstructed):
            element_bbox = element["bbox"]

            if (
                _overlaps(picture_bbox, element_bbox)
                and element_bbox[0] >= picture_bbox[2]
            ):
                reconstructed.insert(index, picture)
                inserted = True
                break

        if not inserted:
            reconstructed.append(picture)

    # Ordenar por posición vertical y horizontal.
    reconstructed.sort(
        key=lambda element: (
            element["bbox"][1],
            element["bbox"][0],
            0 if element["type"] == "picture" else 1,
        )
    )

    # Eliminar los metadatos internos del resultado final.
    for element in reconstructed:
        element.pop("_font_size", None)
        element.pop("_line_height", None)

    return reconstructed


def extract_document(file_path: str) -> dict[str, Any]:
    """Extract and reconstruct a PDF into a clean JSON structure."""
    document_json = pymupdf4llm.to_json(file_path)
    document = json.loads(document_json)
    body_font_size = _get_body_font_size(document.get("pages", []))

    pages = []

    for page in document.get("pages", []):
        page_number = page.get("page_number", 1)
        elements = _reconstruct_page(page, body_font_size)

        for index, element in enumerate(elements):
            element["element_id"] = f"p{page_number}-e{index + 1}"

        pages.append({
            "page_number": page_number,
            "elements": elements,
        })

    return {
        "filename": document.get("filename"),
        "page_count": document.get("page_count", len(pages)),
        "pages": pages,
    }

def _get_font_info(box: dict[str, Any]) -> dict[str, Any]:
    """Extract font size and style information from a PDF box."""
    spans = [
        span
        for line in box.get("textlines", [])
        for span in line.get("spans", [])
        if span.get("text", "").strip()
    ]

    sizes = [
        float(span["size"])
        for span in spans
        if isinstance(span.get("size"), (int, float))
        and span["size"] > 0
    ]

    fonts = [span.get("font", "").lower() for span in spans]

    return {
        "max_fontsize": max(sizes, default=0.0),
        "median_fontsize": (
            sorted(sizes)[len(sizes) // 2] if sizes else 0.0
        ),
        "bold": any(
            "bold" in font or "black" in font or "heavy" in font
            for font in fonts
        ),
        "italic": any(
            "italic" in font or "oblique" in font
            for font in fonts
        ),
        "monospace": any(
            name in font
            for font in fonts
            for name in ("mono", "courier", "consolas", "source code")
        ),
    }


def _looks_like_code(text: str, font_info: dict[str, Any]) -> bool:
    """Detect likely code blocks without classifying every code example as prose."""
    stripped = text.strip()

    if not stripped:
        return False

    if font_info["monospace"]:
        return True

    code_patterns = [
        r"^\s*</?[A-Za-z][^>]*>\s*$",  # HTML/XML tags
        r"^\s*(def|class|import|from|return|const|let|var|function)\b",
        r"^\s*(if|else|for|while|try|catch)\s*[\(:{]",
        r"^\s*[\w.$]+\s*=\s*[^=].*",
        r"^\s*[\{\}\[\]]\s*[,;]?\s*$",
    ]

    return any(re.search(pattern, stripped) for pattern in code_patterns)


def _looks_like_list(text: str, box: dict[str, Any]) -> bool:
    """Detect list items using common markers and numbering."""
    if box.get("boxclass") == "list-item":
        return True

    return bool(
        re.match(
            r"^\s*(?:[•●▪◦‣*-]\s+|\d+[.)]\s+|[a-zA-Z][.)]\s+)",
            text,
        )
    )


def _classify_element(
    box: dict[str, Any],
    text: str,
    font_info: dict[str, Any],
    body_font_size: float,
) -> tuple[str, int | None]:
    """Classify an element using source metadata and typography."""
    original_type = box.get("boxclass", "text")
    text_stripped = text.strip()

    # Preserve semantically clear types from the original parser.
    if original_type == "picture":
        return "picture", None

    if original_type == "table" or box.get("table") is not None:
        return "table", None

    if _looks_like_code(text_stripped, font_info):
        return "code", None

    if _looks_like_list(text_stripped, box):
        return "list-item", None

    # Use PyMuPDF4LLM's heading information where available.
    if original_type in {"title", "section-header"}:
        level = box.get("header_level")
        if not isinstance(level, int) or level < 1 or level > 6:
            level = None
        return "heading", level

    size = font_info["max_fontsize"]

    # Large typography is a heading candidate, not proof by itself.
    if body_font_size > 0 and size >= body_font_size * 1.5:
        return "title", 1

    if (
        body_font_size > 0
        and size >= body_font_size * 1.2
        and (font_info["bold"] or len(text_stripped) < 100)
    ):
        return "heading", 2

    return "text", None


def _get_body_font_size(pages: list[dict[str, Any]]) -> float:
    """Estimate the most common font size used for ordinary text."""
    sizes = []

    for page in pages:
        for box in page.get("boxes", []):
            if box.get("boxclass") != "text":
                continue

            info = _get_font_info(box)

            if info["median_fontsize"] > 0:
                sizes.append(round(info["median_fontsize"], 1))

    if not sizes:
        return 0.0

    return Counter(sizes).most_common(1)[0][0]
