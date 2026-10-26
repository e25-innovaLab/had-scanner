from sqlalchemy.orm import Session

from app.models.adaptation_proposal import AdaptationProposal


def create(
    db: Session,
    *,
    barrier_id: int,
    original_content: str,
    proposed_content: str,
    explanation: str,
) -> AdaptationProposal:
    proposal = AdaptationProposal(
        barrier_id=barrier_id,
        status="pending",
        original_content=original_content,
        proposed_content=proposed_content,
        explanation=explanation,
    )

    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    return proposal