from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.proposal import ProposalResponse
from app.services.adaptation_service import (
    update_adaptation_proposal_status,
)

router = APIRouter(
    prefix="/adaptations",
    tags=["Adaptations"],
)


@router.post(
    "/{proposal_id}/accept",
    response_model=ProposalResponse,
    status_code=status.HTTP_200_OK,
)
def accept_adaptation_proposal_endpoint(
    proposal_id: int,
    db: Session = Depends(get_db),
):
    return update_adaptation_proposal_status(
        db=db,
        proposal_id=proposal_id,
        new_status="accepted",
    )


@router.post(
    "/{proposal_id}/reject",
    response_model=ProposalResponse,
    status_code=status.HTTP_200_OK,
)
def reject_adaptation_proposal_endpoint(
    proposal_id: int,
    db: Session = Depends(get_db),
):
    return update_adaptation_proposal_status(
        db=db,
        proposal_id=proposal_id,
        new_status="rejected",
    )