from typing import Any

from sqlalchemy.orm import Session

from app.models.analysis import Analysis
from app.models.barrier import Barrier
from app.models.material import Material
from app.utils.pdf_parser import extract_document

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.adaptation_generator import generate_adaptation
from app.repositories import proposal_repository

import logging

logger = logging.getLogger(__name__)


def _normalize_text(text: str) -> str:
    """Normalize text for evidence matching."""
    return " ".join(text.casefold().split())


def _get_element_text(element: dict) -> str:
    return str(element.get("text", "")).strip()


def _find_evidence_element(
    evidence,
    elements_by_id: dict[str, dict],
    elements_by_page: dict[int, list[dict]],
) -> dict | None:
    """Find an element using its ID, then its page and anchor."""

    # 1. Exact element ID match.
    if evidence.element_id:
        element = elements_by_id.get(evidence.element_id)

        if element is not None:
            return element

    # 2. Fallback to the evidence anchor on the same page.
    if evidence.page is None or not evidence.anchor:
        return None

    expected = _normalize_text(evidence.anchor)
    page_elements = elements_by_page.get(evidence.page, [])

    for element in page_elements:
        actual = _normalize_text(_get_element_text(element))

        if actual == expected:
            return element

    # 3. Partial match, only if it is unambiguous.
    matches = []

    for element in page_elements:
        actual = _normalize_text(_get_element_text(element))

        if actual and (
            expected in actual or actual in expected
        ):
            matches.append(element)

    if len(matches) == 1:
        return matches[0]

    return None


def _extract_original_content(
    document: dict,
    barrier: Barrier,
) -> str:
    elements_by_id = {}
    elements_by_page = {}

    for page in document.get("pages", []):
        page_number = page.get("page_number", 1)
        page_elements = page.get("elements", [])

        elements_by_page[page_number] = page_elements

        for element in page_elements:
            element_id = element.get("element_id")

            if element_id:
                elements_by_id[element_id] = element

    recovered = []
    seen = set()

    for evidence in barrier.evidences:
        element = _find_evidence_element(
            evidence,
            elements_by_id,
            elements_by_page,
        )

        if element is None:
            continue

        text = _get_element_text(element)

        if not text:
            continue

        normalized = _normalize_text(text)

        if normalized in seen:
            continue

        recovered.append({
            "element_id": element.get("element_id"),
            "page": element.get("page"),
            "type": element.get("type"),
            "text": text,
        })
        seen.add(normalized)

    if not recovered:
        raise ValueError(
            "No original content could be recovered for this barrier."
        )

    return "\n".join(
        item["text"]
        for item in recovered
    )

def create_adaptation_proposal(
    db: Session,
    barrier_id: int,
):
    barrier = db.query(Barrier).filter(
        Barrier.id == barrier_id
    ).first()

    if barrier is None:
        raise HTTPException(
            status_code=404,
            detail="Barrier not found.",
        )

    analysis = db.query(Analysis).filter(
        Analysis.id == barrier.analysis_id
    ).first()

    if analysis is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found.",
        )

    material = db.query(Material).filter(
        Material.id == analysis.material_id
    ).first()

    if material is None:
        raise HTTPException(
            status_code=404,
            detail="Material not found.",
        )

    try:
        document = extract_document(material.file_path)

        original_content = _extract_original_content(
            document,
            barrier,
        )

        adaptation = generate_adaptation(
            barrier_type=barrier.type,
            title=barrier.title,
            description=barrier.description,
            justification=barrier.justification,
            recommendation=barrier.recommendation,
            original_content=original_content,
        )

        return proposal_repository.create(
            db,
            barrier_id=barrier.id,
            original_content=adaptation["original_content"],
            proposed_content=adaptation["proposed_content"],
            explanation=adaptation["explanation"],
        )

    except HTTPException:
        raise

    
    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to generate adaptation proposal for barrier_id=%s",
            barrier_id,
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to generate the adaptation proposal.",
        ) from exc

def update_adaptation_proposal_status(
    db: Session,
    proposal_id: int,
    new_status: str,
):
    proposal = proposal_repository.get_by_id(
        db=db,
        proposal_id=proposal_id,
    )

    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adaptation proposal not found",
        )

    return proposal_repository.update_status(
        db=db,
        proposal=proposal,
        new_status=new_status,
    )