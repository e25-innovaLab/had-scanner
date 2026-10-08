from app.utils.pdf_parser import extract_document


def analyze_material(file_path: str) -> dict:
    return extract_document(file_path)