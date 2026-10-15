
from app.ai.gemini_client import analyze_pdf_with_gemini
from app.utils.pdf_parser import extract_document
from app.services.evidence_matcher import associate_evidence_elements


def analyze_material(file_path: str) -> dict:
    # Extract document elements and their parser IDs.
    document = extract_document(file_path)

    # Analyze the original PDF with Gemini.
    gemini_result = analyze_pdf_with_gemini(file_path)

    # Associate each Gemini evidence with its parser element.
    accessibility_analysis = associate_evidence_elements(
        document=document,
        accessibility_analysis=gemini_result["analysis"],
    )

    return {
        **document,
        "accessibility_analysis": accessibility_analysis,
        "token_usage": gemini_result["token_usage"],
    }
