
from datetime import datetime

from pydantic import BaseModel


class MaterialResponse(BaseModel):
    id: int
    name: str
    status: str


class MaterialListResponse(BaseModel):
    materials: list[MaterialResponse]
    total: int


class MaterialDetailResponse(BaseModel):
    id: int
    name: str
    file_path: str
    file_hash: str
    status: str
    created_at: datetime
