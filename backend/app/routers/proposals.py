from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.proposal import ProposalResponse
from app.services.adaptation_service import create_adaptation_proposal

router = APIRouter(
    prefix="/barriers",
    tags=["Proposals"],
)

@router.post(
    "/{barrier_id}/proposals",
    response_model=ProposalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_proposal_endpoint(
    barrier_id: int,
    db: Session = Depends(get_db),
):
    return create_adaptation_proposal(
        db=db,
        barrier_id=barrier_id,
    )
    