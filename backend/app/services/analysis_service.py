
import logging

from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.repositories import analysis_repository, material_repository
from app.services.analysis_persistence_service import persist_analysis
from app.utils.pdf_parser import extract_document
from app.utils.object_storage import resolve_material_path
from app.ai.gemini_client import analyze_pdf_with_gemini
from app.ai.gemini_errors import analysis_error_message
from app.services.evidence_matcher import associate_evidence_elements
from app.models.analysis import Analysis
from app.core.exceptions import AnalysisCancelledException


logger = logging.getLogger(__name__)

def analyze_material(
    file_path: str,
    on_step=None,
    check_cancelled=None,
) -> dict:
    local_path = str(resolve_material_path(file_path))

    if check_cancelled:
        check_cancelled()

    if on_step:
        on_step("parsing")

    document = extract_document(local_path)

    if check_cancelled:
        check_cancelled()

    if on_step:
        on_step("accessibility_analysis")

    gemini_result = analyze_pdf_with_gemini(local_path)

    # Gemini terminó, pero el usuario pudo cancelar
    # el análisis mientras se procesaba la solicitud.
    if check_cancelled:
        check_cancelled()

    if on_step:
        on_step("associating_evidence")

    accessibility_analysis = associate_evidence_elements(
        document=document,
        accessibility_analysis=gemini_result["analysis"],
    )

    if check_cancelled:
        check_cancelled()

    return {
        **document,
        "accessibility_analysis": accessibility_analysis,
    }



def create_material_analysis(
    db: Session,
    material_id: int,
) -> Analysis:
    return analysis_repository.create_pending(
        db=db,
        material_id=material_id,
    )



def process_analysis_task(
    analysis_id: int,
    material_id: int,
) -> None:
    db = SessionLocal()

    def check_cancelled() -> None:
        if analysis_repository.is_cancellation_requested(
            db=db,
            analysis_id=analysis_id,
        ):
            raise AnalysisCancelledException()

    def set_analysis_step(step: str) -> None:
        check_cancelled()

        analysis_repository.update_current_step(
            db=db,
            analysis_id=analysis_id,
            current_step=step,
        )

    try:
        analysis = db.get(Analysis, analysis_id)

        if analysis is None:
            logger.error(
                "Analysis %s not found",
                analysis_id,
            )
            return

        # Detectar una cancelación solicitada antes de iniciar la tarea.
        check_cancelled()

        if analysis.status != "processing":
            return

        material = material_repository.get_by_id(
            db=db,
            material_id=material_id,
        )

        if material is None:
            raise FileNotFoundError(
                f"Material {material_id} not found or not uploaded"
            )

        result = analyze_material(
            material.file_path,
            on_step=set_analysis_step,
            check_cancelled=check_cancelled,
        )

        check_cancelled()

        set_analysis_step("persisting_results")

        persist_analysis(
            db=db,
            analysis_id=analysis_id,
            analysis_result=result,
        )

        logger.info(
            "Analysis %s completed successfully",
            analysis_id,
        )
        
    except AnalysisCancelledException:
        db.rollback()

        analysis_repository.finish_cancellation(
            db=db,
            analysis_id=analysis_id,
        )

        logger.info(
            "Analysis %s cancelled. Results discarded.",
            analysis_id,
        )

    except Exception as exc:
        logger.exception(
            "Failed to process analysis %s",
            analysis_id,
        )
        user_message = analysis_error_message(exc)

        try:
            db.rollback()

            analysis_repository.mark_failed_if_processing(
                db=db,
                analysis_id=analysis_id,
                error_message=user_message,
            )

            analysis_repository.update_current_step(
                db=db,
                analysis_id=analysis_id,
                current_step="failed",
            )

        except Exception:
            db.rollback()

            logger.exception(
                "Failed to update status for analysis %s",
                analysis_id,
            )

    finally:
        db.close()


def get_analysis_by_id(
    db: Session,
    analysis_id: int,
):
    return analysis_repository.get_by_id(
        db=db,
        analysis_id=analysis_id,
    )
