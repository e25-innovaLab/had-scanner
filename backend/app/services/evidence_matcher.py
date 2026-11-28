import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any

MIN_SIMILARITY = 0.88
MIN_SCORE_DIFFERENCE = 0.08

def normalize_text(text: str) -> str:
    """Normalize text for comparison without changing the original evidence."""
    text = unicodedata.normalize("NFKC", text).lower()

    text = re.sub(r"^[\s•●▪◦\-*]+", "", text)

    text = re.sub(r"[^\w\s]", " ", text)
    return " ".join(text.split())


def types_are_compatible(
    evidence_type: str | None,
    element_type: str | None,
) -> bool:
    """Check whether Gemini's type is compatible with the parser's type."""
    if not evidence_type or not element_type:
        return False

    evidence_type = evidence_type.lower()
    element_type = element_type.lower()

    if evidence_type == element_type:
        return True

    return evidence_type == "text" and element_type == "heading"

def calculate_similarity(anchor: str, element_text: str) -> float:
    """Compare an evidence anchor with an extracted element."""

    if not anchor or not element_text:
        return 0.0

    if anchor == element_text:
        return 1.0

    if anchor in element_text or element_text in anchor:
        return 0.98

    compact_anchor = re.sub(r"\s+", "", anchor)
    compact_element = re.sub(r"\s+", "", element_text)

    if compact_anchor in compact_element:
        return 0.98

    return SequenceMatcher(
        None,
        anchor,
        element_text,
        autojunk=False,
    ).ratio()


def normalize_code(text: str) -> str:
    """Normalize code while preserving identifiers and operators."""
    return re.sub(r"\s+", "", text or "")


def associate_evidence_elements(
    document: dict[str, Any],
    accessibility_analysis: dict[str, Any],
) -> dict[str, Any]:
    """
    Associate Gemini evidence with parser elements.

    The original evidence is preserved. An element_id is assigned only
    when the best candidate is sufficiently reliable and unambiguous.
    """
    result = {
    **accessibility_analysis,
    "barriers": [],
    }

    elements_by_page: dict[int, list[dict[str, Any]]] = {}

    for page_data in document.get("pages", []):
        page_number = page_data.get("page_number")

        for element in page_data.get("elements", []):
            element_page = element.get("page", page_number)

            if element_page is None:
                continue

            elements_by_page.setdefault(int(element_page), []).append(element)

    seen_element_ids = set()

    for barrier in accessibility_analysis.get("barriers", []):
        updated_barrier = {**barrier}
        updated_evidence = []

        for evidence in barrier.get("evidence", []):
            updated = {
                **evidence,
                "element_id": None,
                "match_status": "not_found",
            }

            anchor = normalize_text(str(evidence.get("anchor", "")))
            page = evidence.get("page")

            if not anchor or page is None:
                updated_evidence.append(updated)
                continue

            candidates = []

            for element in elements_by_page.get(int(page), []):
                if element.get("type") == "code" or evidence.get("element_type") == "code":
                    element_text = normalize_code(str(element.get("text", "")))
                    anchor_text = normalize_code(str(evidence.get("anchor", "")))
                else:
                    element_text = normalize_text(str(element.get("text", "")))
                    anchor_text = normalize_text(str(evidence.get("anchor", "")))

                if not element_text:
                    continue

                similarity = calculate_similarity(anchor_text, element_text)

                compatible = types_are_compatible(
                    evidence.get("element_type"),
                    element.get("type"),
                )

                # Type compatibility helps rank candidates, but a type
                # mismatch alone does not invalidate an exact text match.
                score = similarity + (0.03 if compatible else 0.0)

                candidates.append({
                    "element": element,
                    "similarity": similarity,
                    "score": score,
                })

            candidates.sort(
                key=lambda candidate: candidate["score"],
                reverse=True,
            )

            if not candidates:
                updated_evidence.append(updated)
                continue

            best = candidates[0]

            if best["similarity"] < MIN_SIMILARITY:
                updated_evidence.append(updated)
                continue

            if len(candidates) > 1:
                second = candidates[1]

                if best["score"] - second["score"] < MIN_SCORE_DIFFERENCE:
                    updated["match_status"] = "ambiguous"
                    updated_evidence.append(updated)
                    continue

            element_id = best["element"].get("element_id")

            if element_id is None:
                updated_evidence.append(updated)
                continue

            updated["element_id"] = element_id
            updated["match_status"] = "matched"
            updated_evidence.append(updated)

        for evidence in updated_evidence:
            element_id = evidence.get("element_id")

            # Avoid generating multiple barriers for the same document element.
            if element_id is not None:
                if element_id in seen_element_ids:
                    continue

                seen_element_ids.add(element_id)

            single_barrier = {
                **updated_barrier,
                "evidence": [evidence],
            }

            # Update the location to reflect only this evidence.
            page = evidence.get("page")
            location = barrier.get("location")

            if isinstance(location, dict) and page is not None:
                single_barrier["location"] = {
                    **location,
                    "pages": [page],
                }

            result["barriers"].append(single_barrier)

    return result


def _get_element_text(element: dict[str, Any]) -> str:
    return str(element.get("text", "") or "").strip()


def rank_anchor_matches(
    *,
    anchor: str,
    evidence_type: str | None,
    page_elements: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    expected = normalize_text(anchor)
    if not expected:
        return []

    candidates: list[dict[str, Any]] = []
    for element in page_elements:
        actual = normalize_text(_get_element_text(element))
        if not actual:
            continue
        similarity = calculate_similarity(expected, actual)
        compatible = types_are_compatible(
            evidence_type,
            element.get("type"),
        )
        score = similarity + (0.03 if compatible else 0.0)
        candidates.append({
            "element": element,
            "similarity": similarity,
            "score": score,
        })

    candidates.sort(key=lambda item: item["score"], reverse=True)
    return candidates


def pick_best_match(
    candidates: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not candidates:
        return None
    best = candidates[0]
    if best["similarity"] < MIN_SIMILARITY:
        return None
    if len(candidates) > 1:
        second = candidates[1]
        if best["score"] - second["score"] < MIN_SCORE_DIFFERENCE:
            return None
    return best["element"]


def find_evidence_element(
    evidence: Any,
    elements_by_id: dict[str, dict[str, Any]],
    elements_by_page: dict[int, list[dict[str, Any]]],
) -> dict[str, Any] | None:
    """Locate a document element for stored evidence (OCR-tolerant)."""
    element_id = getattr(evidence, "element_id", None)
    if element_id:
        element = elements_by_id.get(element_id)
        if element is not None:
            return element
        if isinstance(evidence, dict):
            element = elements_by_id.get(evidence.get("element_id"))
            if element is not None:
                return element

    page = getattr(evidence, "page", None)
    anchor = getattr(evidence, "anchor", None)
    evidence_type = getattr(evidence, "element_type", None)
    if isinstance(evidence, dict):
        page = evidence.get("page", page)
        anchor = evidence.get("anchor", anchor)
        evidence_type = evidence.get("element_type", evidence_type)

    if page is None or not anchor:
        return None

    page_number = int(page)
    page_order = [page_number, page_number - 1, page_number + 1]
    seen_pages: set[int] = set()
    for candidate_page in page_order:
        if candidate_page < 1 or candidate_page in seen_pages:
            continue
        seen_pages.add(candidate_page)
        match = pick_best_match(
            rank_anchor_matches(
                anchor=str(anchor),
                evidence_type=evidence_type,
                page_elements=elements_by_page.get(candidate_page, []),
            )
        )
        if match is not None:
            return match

    all_elements = [
        element
        for page_elements in elements_by_page.values()
        for element in page_elements
    ]
    return pick_best_match(
        rank_anchor_matches(
            anchor=str(anchor),
            evidence_type=evidence_type,
            page_elements=all_elements,
        )
    )
