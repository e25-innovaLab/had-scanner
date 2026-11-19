
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict


class BarrierDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    severity: Literal["high", "medium", "low"]
    location: dict[str, Any]
    description: str
    justification: str
    recommendation: str
    detected_by: str
    status: str
