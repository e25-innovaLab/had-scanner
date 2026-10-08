from pydantic import BaseModel


class Paragraph(BaseModel):
    id: str
    text: str


class AnalysisResponse(BaseModel):
    paragraphs: list[Paragraph]