from datetime import datetime

from pydantic import BaseModel


class MaterialResponse(BaseModel):
    id: int
    name: str
    status: str
    created_at: datetime


class MaterialListResponse(BaseModel):
    materials: list[MaterialResponse]
    total: int