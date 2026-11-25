import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.proposal_generation import ProposalGeneration


def begin_generation(db: Session, barrier_id: int) -> str:
    """Start or replace tracking for a barrier. Returns this request's token."""
    token = str(uuid.uuid4())
    row = db.get(ProposalGeneration, barrier_id)
    now = datetime.now(timezone.utc)
    if row is None:
        row = ProposalGeneration(
            barrier_id=barrier_id,
            generation_token=token,
            started_at=now,
            cancel_requested=False,
        )
        db.add(row)
    else:
        row.generation_token = token
        row.started_at = now
        row.cancel_requested = False
    db.commit()
    db.refresh(row)
    return token


def request_cancellation(db: Session, barrier_id: int) -> bool:
    row = db.get(ProposalGeneration, barrier_id)
    if row is None:
        return False
    row.cancel_requested = True
    db.commit()
    return True


def is_cancellation_requested(
    db: Session,
    barrier_id: int,
    generation_token: str,
) -> bool:
    """True if cancelled, superseded by a newer generation, or no longer tracked."""
    db.expire_all()
    row = db.get(ProposalGeneration, barrier_id)
    if row is None:
        return True
    if row.generation_token != generation_token:
        return True
    return row.cancel_requested


def finish_generation(
    db: Session,
    barrier_id: int,
    generation_token: str,
) -> None:
    row = db.get(ProposalGeneration, barrier_id)
    if row is None:
        return
    if row.generation_token != generation_token:
        return
    db.delete(row)
    db.commit()
