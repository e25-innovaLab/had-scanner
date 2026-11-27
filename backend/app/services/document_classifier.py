from __future__ import annotations

from typing import Any, Literal

from app.core.config import (
    OCR_MIN_CHARS_PER_PAGE,
    OCR_MIN_TOTAL_CHARS,
)


DocumentClass = Literal["text_rich", "text_poor"]


def _page_text_chars(page: dict[str, Any]) -> int:
    total = 0
    for element in page.get("elements") or []:
        text = (element.get("text") or "").strip()
        if text.startswith("[imagen|"):
            continue
        total += len(text)
    return total


def count_extractable_chars(document: dict[str, Any]) -> int:
    return sum(_page_text_chars(page) for page in document.get("pages") or [])


def text_poor_page_numbers(document: dict[str, Any]) -> list[int]:
    poor: list[int] = []
    for index, page in enumerate(document.get("pages") or [], start=1):
        page_number = int(page.get("page_number") or index)
        if _page_text_chars(page) < OCR_MIN_CHARS_PER_PAGE:
            poor.append(page_number)
    return poor


def is_text_poor(document: dict[str, Any]) -> bool:
    pages = document.get("page_count") or len(document.get("pages") or [])
    page_count = max(int(pages), 1)
    chars = count_extractable_chars(document)
    chars_per_page = chars / page_count
    return (
        chars < OCR_MIN_TOTAL_CHARS
        or chars_per_page < OCR_MIN_CHARS_PER_PAGE
    )


def needs_ocr(document: dict[str, Any]) -> bool:
    return is_text_poor(document) or bool(text_poor_page_numbers(document))


def classify_document(document: dict[str, Any]) -> DocumentClass:
    if is_text_poor(document):
        return "text_poor"
    return "text_rich"
