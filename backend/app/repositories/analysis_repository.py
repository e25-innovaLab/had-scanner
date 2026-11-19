
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import Analysis
from app.models.barrier import Barrier

# Sin latido en este tiempo, un "processing" se considera huérfano.
STALE_AFTER = timedelta(minutes=15)


def is_stale(analysis: Analysis, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    reference = analysis.updated_at or analysis.created_at
    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=timezone.utc)
    return (now - reference) > STALE_AFTER


def create_pending(
    db: Session,
    material_id: int,
) -> Analysis:
    analysis = Analysis(
        material_id=material_id,
        status="processing",
        score=50,
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return analysis


def update_status(
    db: Session,
    analysis_id: int,
    status: str,
    error_message: str | None = None,
) -> Analysis | None:
    analysis = db.get(Analysis, analysis_id)

    if analysis is None:
        return None

    analysis.status = status
    analysis.error_message = error_message

    db.commit()
    db.refresh(analysis)

    return analysis


def get_by_id(
    db: Session,
    analysis_id: int,
) -> Analysis | None:
    statement = (
        select(Analysis)
        .options(
            selectinload(Analysis.barriers).selectinload(
                Barrier.evidences
            )
        )
        .where(Analysis.id == analysis_id)
    )

    return db.scalar(statement)


def update_current_step(
    db: Session,
    analysis_id: int,
    current_step: str,
) -> None:
    statement = (
        update(Analysis)
        .where(
            Analysis.id == analysis_id,
            Analysis.status == "processing",
        )
        .values(
            current_step=current_step,
            updated_at=datetime.now(timezone.utc),  # latido
        )
    )

    db.execute(statement)
    db.commit()


def request_cancellation(
    db: Session,
    analysis_id: int,
) -> bool:
    statement = (
        update(Analysis)
        .where(
            Analysis.id == analysis_id,
            Analysis.status == "processing",
        )
        .values(
            status="cancelling",
            current_step="cancelling",
        )
    )

    result = db.execute(statement)
    db.commit()

    return result.rowcount == 1


def is_cancellation_requested(
    db: Session,
    analysis_id: int,
) -> bool:
    statement = select(Analysis.status).where(
        Analysis.id == analysis_id
    )

    current_status = db.scalar(statement)

    return current_status in ("cancelling", "cancelled")


def finish_cancellation(
    db: Session,
    analysis_id: int,
) -> None:
    statement = (
        update(Analysis)
        .where(
            Analysis.id == analysis_id,
            Analysis.status == "cancelling",
        )
        .values(
            status="cancelled",
            current_step="cancelled",
        )
    )

    db.execute(statement)
    db.commit()


def get_processing_by_material(
    db: Session,
    material_id: int,
) -> Analysis | None:
    statement = (
        select(Analysis)
        .where(
            Analysis.material_id == material_id,
            Analysis.status == "processing",
        )
        .limit(1)
    )

    return db.scalar(statement)

def mark_failed_if_processing(
    db: Session,
    analysis_id: int,
    error_message: str = (
        "No se pudo completar el análisis del material."
    ),
) -> None:
    statement = (
        update(Analysis)
        .where(
            Analysis.id == analysis_id,
            Analysis.status.in_(("processing", "cancelling")),
        )
        .values(
            status="failed",
            current_step="failed",
            error_message=error_message,
            updated_at=datetime.now(timezone.utc),
        )
    )

    db.execute(statement)
    db.commit()


def fail_interrupted_analyses(
    db: Session,
    error_message: str = (
        "Análisis interrumpido por reinicio del servidor."
    ),
) -> int:
    """Marca processing/cancelling residuales como failed. Devuelve cuántos."""
    statement = (
        update(Analysis)
        .where(Analysis.status.in_(("processing", "cancelling")))
        .values(
            status="failed",
            current_step="failed",
            error_message=error_message,
            updated_at=datetime.now(timezone.utc),
        )
    )

    result = db.execute(statement)
    db.commit()

    return result.rowcount or 0