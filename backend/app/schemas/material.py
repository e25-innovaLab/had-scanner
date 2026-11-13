from datetime import datetime

from pydantic import BaseModel, Field
from datetime import datetime


class MaterialResponse(BaseModel):
    id: int
    name: str
    status: str
    created_at: datetime


class MaterialListResponse(BaseModel):
    materials: list[MaterialResponse]
    total: int


class MaterialTextRequest(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=150,
        description="Nombre del material",
    )
    text: str = Field(
        min_length=1,
        max_length=50000,
        description="Contenido educativo ingresado por el docente",
    )
