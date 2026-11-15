from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import barrier_repository

def reject_barrier(db: Session, barrier_id: int):
    barrier = barrier_repository.get_by_id(
        db=db,
        barrier_id=barrier_id,
    )

    if barrier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barrier not found",
        )

    if barrier.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending barriers can be rejected",
        )

    return barrier_repository.update_status(
        db=db,
        barrier=barrier,
        new_status="rejected",
    )