
from sqlalchemy.orm import Session

from app.models.analysis import Analysis
from app.models.barrier import Barrier
from app.models.barrier_evidence import BarrierEvidence


def persist_analysis(
    db: Session,
    analysis_id: int,
    analysis_result: dict,
) -> Analysis:
    accessibility_analysis = analysis_result[
        "accessibility_analysis"
    ]
    barriers_data = accessibility_analysis.get("barriers", [])

    analysis = db.get(Analysis, analysis_id)

    if analysis is None:
        raise RuntimeError(
            f"Analysis {analysis_id} not found"
        )

    try:
        for barrier_data in barriers_data:
            evidence_data = barrier_data.get("evidence", [])

            pages = sorted({
                evidence["page"]
                for evidence in evidence_data
                if isinstance(evidence.get("page"), int)
            })

            barrier = Barrier(
                analysis_id=analysis.id,
                type=barrier_data["dimension"],
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

        analysis.status = "completed"
        analysis.score = 100
        analysis.error_message = None

        db.commit()
        db.refresh(analysis)

        return analysis

    except Exception:
        db.rollback()
        raise
