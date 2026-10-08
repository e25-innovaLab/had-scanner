import json

import pymupdf4llm


def extract_document(file_path: str) -> dict:
    document_json = pymupdf4llm.to_json(file_path)
    document = json.loads(document_json)

    elements = []
    element_id = 1

    for page in document.get("pages", []):
        page_number = page.get("page_number")

        for box in page.get("boxes", []):
            box_type = box.get("boxclass")

            # Ignorar elementos sin contenido útil
            if box_type not in {
                "text",
                "section-header",
                "title",
                "list-item",
                "table",
                "picture",
                "caption",
                "formula",
            }:
                continue

            text = ""

            for textline in box.get("textlines", []):
                for span in textline.get("spans", []):
                    text += span.get("text", "")

            text = text.strip()

            # Las imágenes pueden no tener texto
            if not text and box_type not in {"picture", "table"}:
                continue

            element = {
                "id": f"e{element_id}",
                "type": box_type,
                "page": page_number,
            }

            if text:
                element["text"] = text

            elements.append(element)
            element_id += 1

    return {
        "elements": elements
    }