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
    """
    Recover the original content associated with exactly one
    evidence of a barrier.
    """

    if len(barrier.evidences) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The barrier must contain exactly one evidence "
                "to generate an adaptation proposal."
            ),
        )

    evidence = barrier.evidences[0]

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

    element = _find_evidence_element(
        evidence,
        elements_by_id,
        elements_by_page,
    )

    if element is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The evidence could not be associated "
                "with an original document element."
            ),
        )

    original_content = _get_element_text(element)

    if not original_content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The original content associated with "
                "the evidence is empty."
            ),
        )

    return original_content

def create_adaptation_proposal(
    db: Session,
    barrier_id: int,
):
    try:
        barrier, original_content = _get_barrier_original_content(
            db=db,
            barrier_id=barrier_id,
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
            original_content=original_content,
            proposed_content=adaptation["proposed_content"],
            explanation=adaptation["explanation"],
        )

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to generate adaptation proposal for barrier_id=%s",
            barrier_id,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
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

def get_adaptation_proposal(
    db: Session,
    proposal_id: int,
):
    return proposal_repository.get_by_id(
        db=db,
        proposal_id=proposal_id,
    )

def _get_barrier_original_content(
    db: Session,
    barrier_id: int,
) -> tuple[Barrier, str]:

    barrier = db.query(Barrier).filter(
        Barrier.id == barrier_id
    ).first()

    if barrier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barrier not found.",
        )

    analysis = db.query(Analysis).filter(
        Analysis.id == barrier.analysis_id
    ).first()

    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found.",
        )

    material = db.query(Material).filter(
        Material.id == analysis.material_id
    ).first()

    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found.",
        )

    document = extract_document(material.file_path)

    original_content = _extract_original_content(
        document,
        barrier,
    )

    return barrier, original_content

def create_manual_adaptation_proposal(
    db: Session,
    barrier_id: int,
    proposed_content: str,
    explanation: str,
):
    try:
        barrier, original_content = (
            _get_barrier_original_content(
                db=db,
                barrier_id=barrier_id,
            )
        )

        return proposal_repository.create(
            db,
            barrier_id=barrier.id,
            original_content=original_content,
            proposed_content=proposed_content,
            explanation=explanation,
        )

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to create manual adaptation proposal "
            "for barrier_id=%s",
            barrier_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the manual adaptation proposal.",
        ) from exc