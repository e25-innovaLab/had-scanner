
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import Analysis
from app.models.barrier import Barrier


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
        .values(current_step=current_step)
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
) -> None:
    statement = (
        update(Analysis)
        .where(
            Analysis.id == analysis_id,
            Analysis.status == "processing",
        )
        .values(
            status="failed",
            current_step="failed",
            error_message=(
                "No se pudo completar el análisis del material."
            ),
        )
    )

    db.execute(statement)
    db.commit()