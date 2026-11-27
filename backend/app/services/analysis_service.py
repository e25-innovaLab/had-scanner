
import logging
import threading
import time

from sqlalchemy.orm import Session

from app.ai.errors import GeminiAnalysisError
from app.ai.gemini_client import analyze_pdf_with_gemini
from app.ai.gemini_errors import analysis_error_message
from app.core.config import OCR_MIN_CHARS_PER_PAGE
from app.core.exceptions import AnalysisCancelledException
from app.database.session import SessionLocal
from app.models.analysis import Analysis
from app.repositories import analysis_repository, material_repository
from app.services.analysis_persistence_service import persist_analysis
from app.services.document_classifier import (
    classify_document,
    count_extractable_chars,
    is_text_poor,
    needs_ocr,
    text_poor_page_numbers,
)
from app.services.evidence_matcher import associate_evidence_elements
from app.services.ocr_service import ocr_pdf
from app.utils.object_storage import resolve_material_path
from app.utils.pdf_parser import extract_document


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
    chars_before = count_extractable_chars(document)
    document_class = classify_document(document)
    logger.info(
        "Step parsing finished (pages=%s, chars=%s, class=%s)",
        document.get("page_count"),
        chars_before,
        document_class,
    )

    if check_cancelled:
        check_cancelled()

    working_path = local_path
    ocr_used = False
    if needs_ocr(document):
        poor_pages = text_poor_page_numbers(document)
        # Fully sparse docs (typical scans) need --force-ocr; hybrid
        # --skip-text is enough when only some pages are sparse.
        force_ocr = is_text_poor(document)
        if on_step:
            on_step("ocr")

        ocr_started = time.perf_counter()
        working_path = ocr_pdf(
            local_path,
            page_count=int(document.get("page_count") or 1),
            force=force_ocr,
        )
        logger.info(
            "Step ocr finished in %sms → %s (force=%s, sparse_pages=%s)",
            int((time.perf_counter() - ocr_started) * 1000),
            working_path,
            force_ocr,
            poor_pages,
        )

        if check_cancelled:
            check_cancelled()

        document = extract_document(working_path)
        chars_after = count_extractable_chars(document)
        logger.info(
            "Re-parse after OCR (pages=%s, chars_before=%s, chars_after=%s)",
            document.get("page_count"),
            chars_before,
            chars_after,
        )

        # After OCR, judge the document as a whole — a cover/blank page
        # must not fail an otherwise readable scan.
        if is_text_poor(document):
            logger.error(
                "OCR insufficient text for %s "
                "(chars_before=%s, chars_after=%s, pages=%s, "
                "sparse_pages_after=%s)",
                local_path,
                chars_before,
                chars_after,
                document.get("page_count"),
                text_poor_page_numbers(document),
            )
            raise GeminiAnalysisError(
                "ocr_insufficient_text",
                (
                    "El OCR no recuperó texto suficiente para analizar "
                    "este PDF escaneado."
                ),
            )

        pages = max(int(document.get("page_count") or 1), 1)
        logger.info(
            "OCR text density: %.1f chars/page (threshold %s)",
            chars_after / pages,
            OCR_MIN_CHARS_PER_PAGE,
        )
        ocr_used = True
        document_class = classify_document(document)

    if check_cancelled:
        check_cancelled()

    if on_step:
        on_step("accessibility_analysis")

    gemini_result = analyze_pdf_with_gemini(working_path)

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
        "source_file_path": working_path,
        "document_class": document_class,
        "ocr_used": ocr_used,
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



HEARTBEAT_INTERVAL_SECONDS = 60


def _start_heartbeat(analysis_id: int) -> threading.Event:
    """Refresca updated_at mientras dura el análisis, aunque Gemini tarde.

    Devuelve un Event: al activarlo, el hilo termina.
    """
    stop = threading.Event()

    def beat() -> None:
        db = SessionLocal()
        try:
            while not stop.wait(HEARTBEAT_INTERVAL_SECONDS):
                try:
                    analysis_repository.touch_heartbeat(
                        db=db,
                        analysis_id=analysis_id,
                    )
                except Exception:
                    db.rollback()
                    logger.warning(
                        "Heartbeat failed for analysis %s",
                        analysis_id,
                        exc_info=True,
                    )
        finally:
            db.close()

    threading.Thread(
        target=beat,
        daemon=True,
        name=f"heartbeat-{analysis_id}",
    ).start()
    return stop


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

        heartbeat = _start_heartbeat(analysis_id)
        try:
            result = analyze_material(
                material.file_path,
                on_step=set_analysis_step,
                check_cancelled=check_cancelled,
            )
        finally:
            heartbeat.set()

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
