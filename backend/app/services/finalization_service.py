import logging
import os
import shutil
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import (
    FINALIZE_MODE,
    FINALIZED_RETENTION_CLEANUP_SECONDS,
    FINALIZED_RETENTION_DAYS,
)
from app.models.finalized_document import FinalizedDocument
from app.models.material import Material
from app.repositories import (
    finalization_repository,
)
from app.repositories import material_repository
from app.services.ocr_service import resolve_analyzed_pdf_path
from app.utils.object_storage import (
    delete_stored_file,
    is_storage_uri,
    material_storage_enabled,
    upload_finalized_file,
)
from app.utils.pdf_generator import generate_pdf, extract_document_title
from app.utils.pdf_parser import extract_document

logger = logging.getLogger(__name__)

_retention_lock = threading.Lock()
_last_retention_cleanup_at = 0.0


class NoCompletedAnalysisError(Exception):
    pass


class ProposalEvidenceError(Exception):
    pass


def _collect_replacements(
    document: dict,
    barriers: list,
    proposals: list,
) -> tuple[dict[str, str], set[str]]:
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

    replacements: dict[str, str] = {}
    skipped_elements: set[str] = set()
    claimed_elements: set[str] = set()

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

        element_ids.sort(
            key=lambda element_id: element_positions[element_id]
        )

        if any(
            element_id in claimed_elements
            for element_id in element_ids
        ):
            raise ProposalEvidenceError(
                f"Proposal {proposal.id} overlaps another proposal."
            )

        first_element_id = element_ids[0]
        replacements[first_element_id] = proposal.proposed_content
        skipped_elements.update(element_ids[1:])
        claimed_elements.update(element_ids)

    return replacements, skipped_elements


def _apply_adaptations(
    document: dict,
    barriers: list,
    proposals: list,
) -> tuple[dict, dict[str, str]]:
    replacements, skipped_elements = _collect_replacements(
        document=document,
        barriers=barriers,
        proposals=proposals,
    )

    adapted_pages = []
    for page in document.get("pages", []):
        adapted_elements = []
        for element in page.get("elements", []):
            element_id = element.get("element_id")
            if element_id in skipped_elements:
                continue
            if element_id in replacements:
                adapted_elements.append({
                    **element,
                    "text": replacements[element_id],
                    "_is_adaptation": True,
                })
            else:
                adapted_elements.append(element)
        adapted_pages.append({
            **page,
            "elements": adapted_elements,
        })

    return {
        **document,
        "pages": adapted_pages,
    }, replacements


def _output_paths(material: Material) -> tuple[str, str]:
    output_dir = os.getenv(
        "FINALIZED_DIR",
        "/app/data/finalized",
    )
    os.makedirs(output_dir, exist_ok=True)
    filename = (
        f"{Path(material.name).stem}_final_"
        f"{uuid.uuid4().hex[:8]}.pdf"
    )
    return os.path.join(output_dir, filename), filename


def _write_adapted_pdf(
    *,
    material: Material,
    adapted_document: dict,
    source_document: dict,
    replacements: dict[str, str],
    source_path: Path,
    title: str | None = None,
) -> tuple[str, str, list[str]]:
    """Write the adapted PDF.

    Prefers in-place patch (keeps figures). Falls back to ReportLab rebuild.
    Returns ``(output_path, filename, user_facing_warnings)``.
    """
    output_path, filename = _output_paths(material)
    warnings: list[str] = []
    is_pdf = source_path.suffix.lower() == ".pdf"
    mode = FINALIZE_MODE

    if is_pdf and not replacements:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_path, output_path)
        logger.info(
            "Wrote unmodified source PDF to %s (no accepted adaptations)",
            output_path,
        )
        return output_path, filename, warnings

    use_patch = mode == "patch" and is_pdf and bool(replacements)

    if use_patch:
        from app.services.pdf_patch import (
            append_appendix_pages,
            build_patches_for_replacements,
            patch_pdf,
        )

        patches, patch_warnings, skipped = build_patches_for_replacements(
            source_document,
            replacements,
            source_path=source_path,
        )
        for warning in patch_warnings:
            logger.warning("PDF patch: %s", warning)

        appendix: list[dict[str, str]] = []
        for element_id, reason in skipped.items():
            content = replacements.get(element_id)
            if not content:
                continue
            appendix.append({
                "title": f"Bloque {element_id}",
                "content": content,
            })
            logger.warning(
                "PDF patch: element %s moved to appendix (%s)",
                element_id,
                reason,
            )

        if patches:
            try:
                result = patch_pdf(
                    source_path,
                    patches,
                    output_path,
                )
                for warning in result.warnings:
                    logger.warning("PDF patch: %s", warning)
                if appendix:
                    append_appendix_pages(output_path, appendix)
                    warnings.append(
                        f"{len(appendix)} adaptación"
                        f"{'' if len(appendix) == 1 else 'es'} sin ubicación "
                        "exacta se agregaron al final del PDF."
                    )
                if result.overflows:
                    warnings.append(
                        f"{len(result.overflows)} adaptación"
                        f"{'' if len(result.overflows) == 1 else 'es'} no "
                        "entraron bien en el bloque original."
                    )
                if any("scan overlay" in item for item in result.warnings):
                    warnings.append(
                        "Algunas páginas son escaneos: la adaptación se "
                        "dibujó encima de la imagen."
                    )
                logger.info(
                    "Wrote patched PDF (%s applied) to %s",
                    result.applied,
                    output_path,
                )
                return output_path, filename, warnings
            except Exception:
                logger.exception(
                    "PDF patch failed; falling back to text rebuild"
                )
                warnings.append(
                    "No se pudo editar el PDF original conservando figuras; "
                    "se regeneró un PDF solo con texto."
                )
        elif appendix:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_path, output_path)
            append_appendix_pages(output_path, appendix)
            warnings.append(
                f"{len(appendix)} adaptación"
                f"{'' if len(appendix) == 1 else 'es'} se agregaron al "
                "final del PDF (sin ubicación exacta)."
            )
            return output_path, filename, warnings

    generate_pdf(
        document=adapted_document,
        output_path=output_path,
        title=title,
    )
    if use_patch and not warnings:
        warnings.append(
            "Se regeneró un PDF solo con texto (modo patch no aplicó)."
        )
    logger.info("Wrote rebuilt PDF to %s", output_path)
    return output_path, filename, warnings

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
    source_path = resolve_analyzed_pdf_path(material.file_path)
    local_path = str(source_path)
    document = extract_document(local_path)

    document_title = extract_document_title(document)

    # 5. Apply the adaptations (and collect element_id → text for patch).
    adapted_document, replacements = _apply_adaptations(
        document=document,
        barriers=barriers,
        proposals=proposals,
    )

    # 6–8. Patch source PDF in place (keeps figures) or rebuild text-only.
    output_path, filename, patch_warnings = _write_adapted_pdf(
        material=material,
        adapted_document=adapted_document,
        source_document=document,
        replacements=replacements,
        source_path=source_path,
        title=document_title,
    )
    for warning in patch_warnings:
        logger.info("Finalize warning: %s", warning)

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
