from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import Analysis
from app.models.barrier import Barrier
from app.models.adaptation_proposal import AdaptationProposal
from app.models.finalized_document import FinalizedDocument
from app.models.material import Material
from app.repositories.material_repository import MATERIAL_STATUS_UPLOADED

FINALIZED_STATUS_AVAILABLE = "available"
FINALIZED_STATUS_DELETED = "deleted"


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
        status=FINALIZED_STATUS_AVAILABLE,
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
        FinalizedDocument.status == FINALIZED_STATUS_AVAILABLE,
    )

    return db.scalar(statement)


def get_downloadable_finalized_document(
    db: Session,
    material_id: int,
    document_id: int,
) -> FinalizedDocument | None:
    statement = (
        select(FinalizedDocument)
        .join(Material, Material.id == FinalizedDocument.material_id)
        .where(
            FinalizedDocument.id == document_id,
            FinalizedDocument.material_id == material_id,
            FinalizedDocument.status == FINALIZED_STATUS_AVAILABLE,
            Material.status == MATERIAL_STATUS_UPLOADED,
        )
    )
    return db.scalar(statement)


def get_finalized_documents_by_material(
    db: Session,
    material_id: int,
) -> list[FinalizedDocument]:

    statement = (
        select(FinalizedDocument)
        .where(
            FinalizedDocument.material_id == material_id,
            FinalizedDocument.status == FINALIZED_STATUS_AVAILABLE,
        )
        .order_by(
            FinalizedDocument.created_at.desc(),
            FinalizedDocument.id.desc(),
        )
    )

    return list(db.scalars(statement).all())


def get_all_finalized_documents(
    db: Session,
) -> list[FinalizedDocument]:
    """All visible finalized PDFs for active materials, newest first."""
    statement = (
        select(FinalizedDocument)
        .join(Material, Material.id == FinalizedDocument.material_id)
        .where(
            Material.status == MATERIAL_STATUS_UPLOADED,
            FinalizedDocument.status == FINALIZED_STATUS_AVAILABLE,
        )
        .options(selectinload(FinalizedDocument.material))
        .order_by(
            FinalizedDocument.created_at.desc(),
            FinalizedDocument.id.desc(),
        )
    )
    return list(db.scalars(statement).all())


def soft_delete_finalized_document(
    db: Session,
    document: FinalizedDocument,
) -> None:
    document.status = FINALIZED_STATUS_DELETED
    db.add(document)
    db.commit()


def soft_delete_available_for_material(
    db: Session,
    material_id: int,
) -> int:
    result = db.execute(
        update(FinalizedDocument)
        .where(
            FinalizedDocument.material_id == material_id,
            FinalizedDocument.status == FINALIZED_STATUS_AVAILABLE,
        )
        .values(status=FINALIZED_STATUS_DELETED)
    )
    db.flush()
    return int(result.rowcount or 0)


def hard_delete_finalized_document(
    db: Session,
    document: FinalizedDocument,
) -> None:
    db.delete(document)
    db.commit()


def get_finalized_documents_older_than(
    db: Session,
    *,
    cutoff: datetime,
) -> list[FinalizedDocument]:
    statement = (
        select(FinalizedDocument)
        .where(FinalizedDocument.created_at < cutoff)
        .order_by(FinalizedDocument.created_at.asc())
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
            FinalizedDocument.material_id == material_id,
            FinalizedDocument.status == FINALIZED_STATUS_AVAILABLE,
        )
        .order_by(
            FinalizedDocument.created_at.desc(),
            FinalizedDocument.id.desc(),
        )
        .limit(1)
    )

    return db.scalar(statement)


def get_latest_downloadable_finalized_document(
    db: Session,
    material_id: int,
) -> FinalizedDocument | None:
    statement = (
        select(FinalizedDocument)
        .join(Material, Material.id == FinalizedDocument.material_id)
        .where(
            FinalizedDocument.material_id == material_id,
            FinalizedDocument.status == FINALIZED_STATUS_AVAILABLE,
            Material.status == MATERIAL_STATUS_UPLOADED,
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
