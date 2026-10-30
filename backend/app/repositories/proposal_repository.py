from sqlalchemy.orm import Session
from typing import Optional

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

def get_by_id(
    db: Session,
    proposal_id: int,
) -> Optional[AdaptationProposal]:
    return (
        db.query(AdaptationProposal)
        .filter(AdaptationProposal.id == proposal_id)
        .first()
    )


def update_status(
    db: Session,
    proposal: AdaptationProposal,
    new_status: str,
) -> AdaptationProposal:
    proposal.status = new_status

    db.commit()
    db.refresh(proposal)

    return proposal