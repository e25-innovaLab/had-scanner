
from sqlalchemy import select
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
