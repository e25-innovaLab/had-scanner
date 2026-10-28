
from pydantic import BaseModel, ConfigDict, Field


class BarrierEvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    element_id: str | None
    page: int | None
    element_type: str | None
    anchor: str
    context_role: str | None
    match_status: str


class BarrierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    severity: str
    location: dict
    description: str
    justification: str
    recommendation: str
    detected_by: str
    status: str
    evidences: list[BarrierEvidenceResponse]


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    analysis_id: int = Field(validation_alias="id")
    material_id: int
    status: str
    score: int
    error_message: str | None = None
    barriers: list[BarrierResponse]
