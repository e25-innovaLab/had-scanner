from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import Analysis
from app.models.barrier import Barrier
from app.models.barrier_evidence import BarrierEvidence


def create(
    db: Session,
    material_id: int,
    accessibility_analysis: dict,
) -> Analysis:
    barriers_data = accessibility_analysis.get("barriers", [])

    analysis = Analysis(
        material_id=material_id,
        status="completed",
        score=100,
    )

    for barrier_data in barriers_data:
        evidence_data = barrier_data.get("evidence", [])

        pages = sorted({
            evidence["page"]
            for evidence in evidence_data
            if isinstance(evidence.get("page"), int)
        })

        barrier = Barrier(
            type=barrier_data["dimension"],
            title=barrier_data["title"],
            severity="medium",
            location={"pages": pages},
            description=barrier_data["description"],
            justification=barrier_data["justification"],
            recommendation=barrier_data["recommendation"],
            detected_by="gemini",
            status="pending",
            evidences=[
                BarrierEvidence(
                    element_id=evidence.get("element_id"),
                    page=evidence.get("page"),
                    element_type=evidence.get("element_type"),
                    anchor=evidence["anchor"],
                    context_role=evidence.get("context_role"),
                    match_status=evidence.get(
                        "match_status",
                        "pending",
                    ),
                )
                for evidence in evidence_data
            ],
        )

        analysis.barriers.append(barrier)

    try:
        db.add(analysis)
        db.commit()
    except Exception:
        db.rollback()
        raise

    statement = (
        select(Analysis)
        .options(
            selectinload(Analysis.barriers).selectinload(
                Barrier.evidences
            )
        )
        .where(Analysis.id == analysis.id)
    )

    return db.scalar(statement)
