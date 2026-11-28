import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.adaptation_generator import generate_adaptation
from app.ai.gemini_errors import proposal_http_error
from app.core.exceptions import ProposalCancelledException
from app.models.analysis import Analysis
from app.models.barrier import Barrier
from app.models.material import Material
from app.repositories import proposal_generation_repository, proposal_repository
from app.services.evidence_matcher import (
    _get_element_text,
    find_evidence_element,
)
from app.services.ocr_service import resolve_analyzed_pdf_path
from app.utils.pdf_parser import extract_document

logger = logging.getLogger(__name__)


def _extract_original_content(
    document: dict,
    barrier: Barrier,
) -> str:
    """Recover original content for exactly one evidence of a barrier."""

    if len(barrier.evidences) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The barrier must contain exactly one evidence "
                "to generate an adaptation proposal."
            ),
        )

    evidence = barrier.evidences[0]

    elements_by_id: dict[str, dict] = {}
    elements_by_page: dict[int, list[dict]] = {}

    for page in document.get("pages", []):
        page_number = int(page.get("page_number") or 1)
        page_elements = page.get("elements", [])
        elements_by_page[page_number] = page_elements
        for element in page_elements:
            element_id = element.get("element_id")
            if element_id:
                elements_by_id[element_id] = element

    element = find_evidence_element(
        evidence,
        elements_by_id,
        elements_by_page,
    )

    if element is not None:
        original_content = _get_element_text(element)
        if original_content:
            return original_content

    # After OCR re-parse, element ids/bboxes often drift. The stored Gemini
    # anchor is still enough to generate a proposal.
    anchor = str(getattr(evidence, "anchor", "") or "").strip()
    if anchor:
        logger.warning(
            "Barrier %s: using evidence anchor as original content "
            "(element match failed after re-parse)",
            barrier.id,
        )
        return anchor

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=(
            "The evidence could not be associated "
            "with an original document element."
        ),
    )

  
def create_adaptation_proposal(
    db: Session,
    barrier_id: int,
):
    generation_token = proposal_generation_repository.begin_generation(
        db=db,
        barrier_id=barrier_id,
    )
    try:
        barrier, original_content = _get_barrier_original_content(
            db=db,
            barrier_id=barrier_id,
        )

        if proposal_generation_repository.is_cancellation_requested(
            db=db,
            barrier_id=barrier_id,
            generation_token=generation_token,
        ):
            raise ProposalCancelledException()

        adaptation = generate_adaptation(
            barrier_type=barrier.type,
            title=barrier.title,
            description=barrier.description,
            justification=barrier.justification,
            recommendation=barrier.recommendation,
            original_content=original_content,
        )

        if proposal_generation_repository.is_cancellation_requested(
            db=db,
            barrier_id=barrier_id,
            generation_token=generation_token,
        ):
            raise ProposalCancelledException()

        return proposal_repository.create(
            db,
            barrier_id=barrier.id,
            original_content=original_content,
            proposed_content=adaptation["proposed_content"],
            explanation=adaptation["explanation"],
        )

    except ProposalCancelledException:
        logger.info(
            "Proposal generation cancelled for barrier_id=%s",
            barrier_id,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Generación de propuesta cancelada.",
        ) from None

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to generate adaptation proposal for barrier_id=%s",
            barrier_id,
        )
        status_code, detail = proposal_http_error(exc)
        raise HTTPException(
            status_code=status_code,
            detail=detail,
        ) from exc

    finally:
        proposal_generation_repository.finish_generation(
            db=db,
            barrier_id=barrier_id,
            generation_token=generation_token,
        )


def cancel_adaptation_proposal_generation(
    db: Session,
    barrier_id: int,
) -> bool:
    barrier = db.query(Barrier).filter(Barrier.id == barrier_id).first()
    if barrier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barrier not found.",
        )
    return proposal_generation_repository.request_cancellation(
        db=db,
        barrier_id=barrier_id,
    )


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

    try:
        local_path = str(
            resolve_analyzed_pdf_path(material.file_path)
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Material file not found. "
                "Re-upload the same file to restore it, or check "
                "Supabase Storage configuration."
            ),
        ) from exc

    document = extract_document(local_path)

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