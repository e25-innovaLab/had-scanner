
from app.ai.gemini_client import analyze_pdf_with_gemini
from app.utils.pdf_parser import extract_document


def analyze_material(file_path: str) -> dict:
    # Extraer el documento con el parser existente.
    document = extract_document(file_path)

    # Analizar el PDF original con Gemini.
    gemini_result = analyze_pdf_with_gemini(file_path)

    return {
        **document,
        "accessibility_analysis": gemini_result["analysis"],
        "token_usage": gemini_result["token_usage"],
    }