
from sqlalchemy.orm import Session

from app.models.analysis import Analysis
from app.models.barrier import Barrier
from app.models.barrier_evidence import BarrierEvidence


def persist_analysis(
    db: Session,
    material_id: int,
    analysis_result: dict,
) -> Analysis:
    accessibility_analysis = analysis_result["accessibility_analysis"]
    barriers_data = accessibility_analysis.get("barriers", [])

    analysis = Analysis(
        material_id=material_id,
        status="completed",
        score=100,
    )

    try:
        db.add(analysis)
        db.flush()

        for barrier_data in barriers_data:
            evidence_data = barrier_data.get("evidence", [])

            dimension = barrier_data["dimension"]

            pages = sorted({
                evidence["page"]
                for evidence in evidence_data
                if isinstance(evidence.get("page"), int)
            })

            barrier = Barrier(
                analysis_id=analysis.id,
                type=dimension,
                title=barrier_data["title"],
                severity="medium",
                location={"pages": pages},
                description=barrier_data["description"],
                justification=barrier_data["justification"],
                recommendation=barrier_data["recommendation"],
                detected_by="gemini",
                status="pending",
            )

            db.add(barrier)
            db.flush()

            for evidence in evidence_data:
                db.add(
                    BarrierEvidence(
                        barrier_id=barrier.id,
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
                )

        db.commit()
        db.refresh(analysis)

        _ = [
            (barrier.evidences, barrier.id)
            for barrier in analysis.barriers
        ]

        return analysis

    except Exception:
        db.rollback()
        raise
