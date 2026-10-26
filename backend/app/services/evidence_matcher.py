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
        "barriers": [
            {
                **barrier,
                "evidence": None,
            }
            for barrier in []
        ],
    }

    result["barriers"] = []

    elements_by_page: dict[int, list[dict[str, Any]]] = {}

    for page_data in document.get("pages", []):
        page_number = page_data.get("page_number")

        for element in page_data.get("elements", []):
            element_page = element.get("page", page_number)

            if element_page is None:
                continue

            elements_by_page.setdefault(int(element_page), []).append(element)

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

                if not element_text:
                    continue

                similarity = calculate_similarity(anchor, element_text)
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

        updated_barrier["evidence"] = updated_evidence
        result["barriers"].append(updated_barrier)

    return result
