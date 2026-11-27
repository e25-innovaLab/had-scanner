import logging
import os
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import (
    FINALIZED_RETENTION_CLEANUP_SECONDS,
    FINALIZED_RETENTION_DAYS,
)
from app.repositories import (
    finalization_repository,
)
from app.repositories import material_repository
from app.services.ocr_service import resolve_analyzed_pdf_path
from app.utils.pdf_parser import extract_document
from app.utils.pdf_generator import generate_pdf, extract_document_title
from app.utils.object_storage import (
    delete_stored_file,
    is_storage_uri,
    material_storage_enabled,
    upload_finalized_file,
)
from app.models.finalized_document import FinalizedDocument

logger = logging.getLogger(__name__)

_retention_lock = threading.Lock()
_last_retention_cleanup_at = 0.0


class NoCompletedAnalysisError(Exception):
    pass


class ProposalEvidenceError(Exception):
    pass


def _apply_adaptations(
    document: dict,
    barriers: list,
    proposals: list,
) -> dict:

    elements = [
        element
        for page in document.get("pages", [])
        for element in page.get("elements", [])
    ]

    element_positions = {
        element["element_id"]: index
        for index, element in enumerate(elements)
        if element.get("element_id")
    }

    barriers_by_id = {
        barrier.id: barrier
        for barrier in barriers
    }

    replacements = {}
    skipped_elements = set()
    claimed_elements = set()

    for proposal in proposals:

        barrier = barriers_by_id.get(proposal.barrier_id)

        if barrier is None:
            continue

        element_ids = list(dict.fromkeys(
            evidence.element_id
            for evidence in barrier.evidences
            if evidence.element_id
        ))

        if not element_ids:
            raise ProposalEvidenceError(
                f"Proposal {proposal.id} has no linked evidence."
            )

        missing_ids = [
            element_id
            for element_id in element_ids
            if element_id not in element_positions
        ]

        if missing_ids:
            raise ProposalEvidenceError(
                f"Proposal {proposal.id} references "
                f"unknown elements: {missing_ids}"
            )

        # Order elements according to their position in the document.
        element_ids.sort(
            key=lambda element_id: element_positions[element_id]
        )

        # Avoid applying overlapping proposals.
        if any(
            element_id in claimed_elements
            for element_id in element_ids
        ):
            raise ProposalEvidenceError(
                f"Proposal {proposal.id} overlaps another proposal."
            )

        # Replace the first original element.
        first_element_id = element_ids[0]

        replacements[first_element_id] = (
            proposal.proposed_content
        )

        # The remaining original elements are already
        # represented by the proposed content.
        skipped_elements.update(element_ids[1:])

        claimed_elements.update(element_ids)

    adapted_pages = []

    for page in document.get("pages", []):

        adapted_elements = []

        for element in page.get("elements", []):

            element_id = element.get("element_id")

            if element_id in skipped_elements:
                continue

            if element_id in replacements:

                adapted_element = {
                    **element,
                    "text": replacements[element_id],
                    "_is_adaptation": True,
                }

                adapted_elements.append(adapted_element)

            else:
                adapted_elements.append(element)

        adapted_pages.append({
            **page,
            "elements": adapted_elements,
        })

    return {
        **document,
        "pages": adapted_pages,
    }

def finalize_material(
    db: Session,
    material_id: int,
) -> FinalizedDocument:

    material = material_repository.get_by_id(
        db=db,
        material_id=material_id,
    )

    if material is None:
        raise LookupError("Material not found")

    # 1. Retrieve the latest completed analysis.
    analysis = (
        finalization_repository.get_latest_completed_analysis(
            db=db,
            material_id=material_id,
        )
    )

    if analysis is None:
        raise NoCompletedAnalysisError(
            "Material has no completed analysis."
        )

    # 2. Retrieve barriers and their evidences.
    barriers = finalization_repository.get_barriers_by_analysis(
        db=db,
        analysis_id=analysis.id,
    )

    barrier_ids = [
        barrier.id
        for barrier in barriers
    ]

    # 3. Retrieve accepted proposals.
    proposals = finalization_repository.get_proposals_by_barriers(
        db=db,
        barrier_ids=barrier_ids,
        statuses=["accepted"],
    )

    # 4. Prefer OCR working copy when analysis produced one, then parse.
    local_path = str(resolve_analyzed_pdf_path(material.file_path))
    document = extract_document(local_path)

    document_title = extract_document_title(document)

    # 5. Apply the adaptations.
    adapted_document = _apply_adaptations(
        document=document,
        barriers=barriers,
        proposals=proposals,
    )

    # 6. Create the output directory.
    output_dir = os.getenv(
        "FINALIZED_DIR",
        "/app/data/finalized",
    )

    os.makedirs(output_dir, exist_ok=True)

    # 7. Generate a unique filename.
    filename = (
        f"{Path(material.name).stem}_final_"
        f"{uuid.uuid4().hex[:8]}.pdf"
    )

    output_path = os.path.join(
        output_dir,
        filename,
    )

    # 8. Generate the PDF.
    generate_pdf(
        document=adapted_document,
        output_path=output_path,
        title=document_title,
    )

    stored_path = output_path
    try:
        db.expire(material)
        if material_repository.get_by_id(db=db, material_id=material_id) is None:
            raise LookupError("Material not found")

        # 9. Persist to Supabase Storage when configured (survives Render disk).
        if material_storage_enabled():
            stored_path = upload_finalized_file(
                local_path=Path(output_path),
                material_id=material_id,
                filename=filename,
            )

        db.expire_all()
        if material_repository.get_by_id(db=db, material_id=material_id) is None:
            raise LookupError("Material not found")

        # 10. Register the generated document.
        finalized_document = (
            finalization_repository.create_finalized_document(
                db=db,
                material_id=material_id,
                filename=filename,
                file_path=stored_path,
            )
        )

        db.commit()
        db.refresh(finalized_document)

        if is_storage_uri(stored_path) and os.path.isfile(output_path):
            os.remove(output_path)

        return finalized_document

    except Exception:
        db.rollback()

        if is_storage_uri(stored_path):
            delete_stored_file(stored_path)

        if os.path.isfile(output_path):
            os.remove(output_path)

        raise


def list_all_finalized_documents(
    db: Session,
) -> list[FinalizedDocument]:
    maybe_cleanup_expired_finalized_documents(db=db)
    return finalization_repository.get_all_finalized_documents(db=db)


def delete_finalized_document(
    db: Session,
    *,
    material_id: int,
    document_id: int,
) -> None:
    document = finalization_repository.get_finalized_document_by_id(
        db=db,
        material_id=material_id,
        document_id=document_id,
    )
    if document is None:
        raise LookupError("Finalized document not found")

    finalization_repository.soft_delete_finalized_document(
        db=db,
        document=document,
    )


def soft_delete_finalized_documents_for_material(
    db: Session,
    material_id: int,
) -> int:
    return finalization_repository.soft_delete_available_for_material(
        db=db,
        material_id=material_id,
    )


def cleanup_expired_finalized_documents(
    db: Session,
    *,
    retention_days: int | None = None,
    now: datetime | None = None,
) -> int:
    """Delete finalized PDFs older than retention. Returns deleted count."""
    days = (
        FINALIZED_RETENTION_DAYS
        if retention_days is None
        else retention_days
    )
    if days <= 0:
        return 0

    cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=days)
    expired = finalization_repository.get_finalized_documents_older_than(
        db=db,
        cutoff=cutoff,
    )
    deleted = 0
    for document in expired:
        file_path = document.file_path
        try:
            delete_stored_file(file_path, strict=True)
            finalization_repository.hard_delete_finalized_document(
                db=db,
                document=document,
            )
            deleted += 1
        except Exception:
            logger.exception(
                "Failed to expire finalized document %s",
                getattr(document, "id", "?"),
            )
    return deleted


def maybe_cleanup_expired_finalized_documents(
    db: Session,
    *,
    force: bool = False,
    now_monotonic: float | None = None,
) -> int:
    """Throttled retention sweep for startup, background, and list traffic."""
    global _last_retention_cleanup_at

    interval = FINALIZED_RETENTION_CLEANUP_SECONDS
    if FINALIZED_RETENTION_DAYS <= 0:
        return 0

    current = time.monotonic() if now_monotonic is None else now_monotonic
    with _retention_lock:
        if (
            not force
            and interval > 0
            and _last_retention_cleanup_at > 0
            and (current - _last_retention_cleanup_at) < interval
        ):
            return 0
        _last_retention_cleanup_at = current

    return cleanup_expired_finalized_documents(db=db)
