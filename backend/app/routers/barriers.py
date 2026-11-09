
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories import barrier_repository
from app.schemas.barrier import BarrierDetailResponse


router = APIRouter(
    prefix="/barriers",
    tags=["Barriers"],
)


@router.get(
    "/{barrier_id}",
    response_model=BarrierDetailResponse,
    status_code=status.HTTP_200_OK,
)
def get_barrier_by_id_endpoint(
    barrier_id: int,
    db: Session = Depends(get_db),
):
    barrier = barrier_repository.get_by_id(
        db=db,
        barrier_id=barrier_id,
    )

    if barrier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barrier not found",
        )

    return barrier
