from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.proposal_generation import ProposalGeneration


def begin_generation(db: Session, barrier_id: int) -> ProposalGeneration:
    row = db.get(ProposalGeneration, barrier_id)
    now = datetime.now(timezone.utc)
    if row is None:
        row = ProposalGeneration(
            barrier_id=barrier_id,
            started_at=now,
            cancel_requested=False,
        )
        db.add(row)
    else:
        row.started_at = now
        row.cancel_requested = False
    db.commit()
    db.refresh(row)
    return row


def request_cancellation(db: Session, barrier_id: int) -> bool:
    row = db.get(ProposalGeneration, barrier_id)
    if row is None:
        return False
    row.cancel_requested = True
    db.commit()
    return True


def is_cancellation_requested(db: Session, barrier_id: int) -> bool:
    db.expire_all()
    row = db.get(ProposalGeneration, barrier_id)
    return row is not None and row.cancel_requested


def finish_generation(db: Session, barrier_id: int) -> None:
    row = db.get(ProposalGeneration, barrier_id)
    if row is None:
        return
    db.delete(row)
    db.commit()
