
import logging

from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.repositories import analysis_repository, material_repository
from app.services.analysis_persistence_service import persist_analysis
from app.utils.pdf_parser import extract_document
from app.ai.gemini_client import analyze_pdf_with_gemini
from app.services.evidence_matcher import associate_evidence_elements
from app.models.analysis import Analysis


logger = logging.getLogger(__name__)


def analyze_material(file_path: str, on_step=None) -> dict:
    if on_step:
        on_step("parsing")

    document = extract_document(file_path)

    if on_step:
        on_step("accessibility_analysis")

    gemini_result = analyze_pdf_with_gemini(file_path)

    if on_step:
        on_step("associating_evidence")

    accessibility_analysis = associate_evidence_elements(
        document=document,
        accessibility_analysis=gemini_result["analysis"],
    )

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

    def set_analysis_step(step: str) -> None:
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
        )

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

    except Exception:
        logger.exception(
            "Failed to process analysis %s",
            analysis_id,
        )

        try:
            db.rollback()

            analysis_repository.update_status(
                db=db,
                analysis_id=analysis_id,
                status="failed",
                error_message=(
                    "No se pudo completar el análisis del material."
                ),
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

def set_analysis_step(step: str) -> None:
    analysis_repository.update_current_step(
        db=db,
        analysis_id=analysis_id,
        current_step=step,
    )

def get_analysis_by_id(
    db: Session,
    analysis_id: int,
):
    return analysis_repository.get_by_id(
        db=db,
        analysis_id=analysis_id,
    )
