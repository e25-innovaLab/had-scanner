from pydantic import BaseModel, Field


class ManualProposalCreate(BaseModel):
    proposed_content: str = Field(
        min_length=1,
        description="Content proposed by the user.",
    )

    explanation: str = Field(
        min_length=1,
        description="Explanation of the proposed adaptation.",
    )