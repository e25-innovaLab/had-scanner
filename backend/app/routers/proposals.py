from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.proposal import ProposalResponse
from app.services.adaptation_service import (
    create_adaptation_proposal,
    get_adaptation_proposal,
    create_manual_adaptation_proposal,
)

from app.schemas.adaptation_proposal import (
    ManualProposalCreate
)

router = APIRouter(
    tags=["Proposals"],
)

@router.post(
    "/barriers/{barrier_id}/proposals/generate",
    response_model=ProposalResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_proposal_endpoint(
    barrier_id: int,
    db: Session = Depends(get_db),
):
    return create_adaptation_proposal(
        db=db,
        barrier_id=barrier_id,
    )

@router.post(
    "/barriers/{barrier_id}/proposals",
    response_model=ProposalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_manual_proposal_endpoint(
    barrier_id: int,
    proposal_data: ManualProposalCreate,
    db: Session = Depends(get_db),
):
    return create_manual_adaptation_proposal(
        db=db,
        barrier_id=barrier_id,
        proposed_content=proposal_data.proposed_content,
        explanation=proposal_data.explanation,
    )

@router.get(
    "/proposals/{proposal_id}",
    response_model=ProposalResponse,
    status_code=status.HTTP_200_OK,
)
def get_proposal_endpoint(
    proposal_id: int,
    db: Session = Depends(get_db),
):
    proposal = get_adaptation_proposal(
        db=db,
        proposal_id=proposal_id,
    )

    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adaptation proposal not found",
        )

    return proposal
