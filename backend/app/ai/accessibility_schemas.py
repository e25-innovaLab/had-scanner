from typing import Literal
from pydantic import BaseModel, Field

class AccessibilityEvidence(BaseModel):
    page: int = Field(ge=1)
    element_type: Literal[
        "heading",
        "text",
        "list-item",
        "code",
        "picture",
    ]
    anchor: str = Field(
        min_length=1,
        description=(
            "Fragmento literal y breve del documento "
            "que permita localizar el elemento original."
        ),
    )
    context_role: str = Field(
        description=(
            "Función del fragmento dentro de la barrera, "
            "por ejemplo: index_item, missing_step, example."
        )
    )


class AccessibilityBarrierCandidate(BaseModel):
    dimension: Literal["comprension", "estructura"]
    title: str
    description: str
    justification: str
    recommendation: str
    evidence: list[AccessibilityEvidence] = Field(
        min_length=1,
        description=(
            "Todos los fragmentos necesarios para fundamentar "
            "la barrera, incluso si pertenecen a páginas distintas."
        ),
    )


class AccessibilityAnalysis(BaseModel):
    barriers: list[AccessibilityBarrierCandidate]