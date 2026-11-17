from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import Analysis
from app.models.barrier import Barrier
from app.models.adaptation_proposal import AdaptationProposal
from app.models.finalized_document import FinalizedDocument

def create_finalized_document(
    db: Session,
    material_id: int,
    filename: str,
    file_path: str,
) -> FinalizedDocument:

    finalized_document = FinalizedDocument(
        material_id=material_id,
        filename=filename,
        file_path=file_path,
    )

    db.add(finalized_document)
    db.flush()

    return finalized_document


def get_finalized_document_by_id(
    db: Session,
    material_id: int,
    document_id: int,
) -> FinalizedDocument | None:

    statement = select(FinalizedDocument).where(
        FinalizedDocument.id == document_id,
        FinalizedDocument.material_id == material_id,
    )

    return db.scalar(statement)


def get_finalized_documents_by_material(
    db: Session,
    material_id: int,
) -> list[FinalizedDocument]:

    statement = (
        select(FinalizedDocument)
        .where(
            FinalizedDocument.material_id == material_id
        )
        .order_by(
            FinalizedDocument.created_at.desc(),
            FinalizedDocument.id.desc(),
        )
    )

    return list(db.scalars(statement).all())

def get_latest_completed_analysis(
    db: Session,
    material_id: int,
) -> Analysis | None:
    statement = (
        select(Analysis)
        .where(
            Analysis.material_id == material_id,
            Analysis.status == "completed",
        )
        .order_by(
            Analysis.created_at.desc(),
            Analysis.id.desc(),
        )
        .limit(1)
    )

    return db.scalar(statement)

def get_latest_finalized_document(
    db: Session,
    material_id: int,
) -> FinalizedDocument | None:

    statement = (
        select(FinalizedDocument)
        .where(
            FinalizedDocument.material_id == material_id
        )
        .order_by(
            FinalizedDocument.created_at.desc(),
            FinalizedDocument.id.desc(),
        )
        .limit(1)
    )

    return db.scalar(statement)

def get_barriers_by_analysis(
    db: Session,
    analysis_id: int,
) -> list[Barrier]:
    statement = (
        select(Barrier)
        .where(Barrier.analysis_id == analysis_id)
        .options(
            selectinload(Barrier.evidences),
        )
    )

    return list(db.scalars(statement).all())


def get_proposals_by_barriers(
    db: Session,
    barrier_ids: list[int],
    statuses: list[str],
) -> list[AdaptationProposal]:

    if not barrier_ids:
        return []

    statement = select(AdaptationProposal).where(
        AdaptationProposal.barrier_id.in_(barrier_ids),
        AdaptationProposal.status.in_(statuses),
    )

    return list(db.scalars(statement).all())