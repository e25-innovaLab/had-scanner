
from app.ai.gemini_client import send_greeting
from app.rules import run_rules
from app.utils.pdf_parser import extract_document
from app.services.ai_context_service import build_ai_context


def analyze_material(file_path: str) -> dict:
    document = extract_document(file_path)
    rule_analysis = run_rules(document)
    ai_context = build_ai_context(document, rule_analysis)

    gemini_response = send_greeting()

    return {
        **document,
        "analysis": rule_analysis,
        "ai_context": ai_context,
        "gemini_test": {
            "success": True,
            "response": gemini_response,
        },
    }