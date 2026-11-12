
from sqlalchemy.orm import Session
from app.models.barrier import Barrier

def get_by_id(
    db: Session,
    barrier_id: int,
) -> Barrier | None:
    return db.get(Barrier, barrier_id)

def update_status(
    db: Session,
    barrier: Barrier,
    new_status: str,
) -> Barrier:
    barrier.status = new_status

    db.commit()
    db.refresh(barrier)

    return barrier
