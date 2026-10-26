from pydantic import BaseModel, ConfigDict, Field


class ProposalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    proposal_id: int = Field(validation_alias="id")
    barrier_id: int
    status: str
    original_content: str
    proposed_content: str
    explanation: str