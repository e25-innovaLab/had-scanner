from app.rules.base import RuleFinding

MAX_PARAGRAPH_WORDS = 100

def check_long_paragraphs(
    document: dict,
    max_words: int = MAX_PARAGRAPH_WORDS,
) -> list[RuleFinding]:
    """Identify long text blocks for semantic review."""

    findings = []

    for page in document.get("pages", []):
        for index, element in enumerate(page.get("elements", [])):
            if element.get("type") != "text":
                continue

            text = element.get("text", "").strip()

            if not text:
                continue

            word_count = len(text.split())

            if word_count <= max_words:
                continue

            findings.append(
                RuleFinding(
                    rule_id="COM-001",
                    dimension="comprehension",
                    criterion="paragraph_length",
                    status="requires_review",
                    message=(
                        "Se detectó un bloque de texto extenso "
                        "que requiere evaluación de su comprensión."
                    ),
                    page=element.get(
                        "page", page.get("page_number")
                    ),
                    evidence={
                        "element_index": index,
                        "word_count": word_count,
                        "threshold": max_words,
                        "text": text,
                    },
                )
            )

    return findings