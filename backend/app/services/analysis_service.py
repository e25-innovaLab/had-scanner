from sqlalchemy.orm import Session
from app.models.analysis import Analysis
from app.services.analysis_persistence_service import persist_analysis
from app.services.evidence_matcher import associate_evidence_elements
from app.utils.pdf_parser import extract_document
from app.ai.gemini_client import analyze_pdf_with_gemini
from app.repositories import analysis_repository

def analyze_material(file_path: str) -> dict:
    document = extract_document(file_path)

    gemini_result = analyze_pdf_with_gemini(file_path)

    accessibility_analysis = associate_evidence_elements(
        document=document,
        accessibility_analysis=gemini_result["analysis"],
    )

    return {
        **document,
        "accessibility_analysis": accessibility_analysis,
    }


def create_material_analysis(
    db: Session,
    material_id: int,
    file_path: str,
) -> Analysis:
    result = analyze_material(file_path)

    return persist_analysis(
        db=db,
        material_id=material_id,
        analysis_result=result,
    )

def get_analysis_by_id(
    db: Session,
    analysis_id: int,
):
    return analysis_repository.get_by_id(
        db=db,
        analysis_id=analysis_id,
    )