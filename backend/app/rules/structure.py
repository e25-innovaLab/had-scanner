from app.rules.base import RuleFinding

def check_heading_hierarchy(document: dict) -> list[RuleFinding]:
    """Detect possible heading hierarchy skips."""

    findings = []
    previous_level = None
    previous_page = None

    for page in document.get("pages", []):
        for element in page.get("elements", []):
            if element.get("type") not in {"heading", "title"}:
                continue

            level = element.get("heading_level")

            if not isinstance(level, int) or not 1 <= level <= 6:
                continue

            if previous_level is not None and level > previous_level + 1:
                findings.append(
                    RuleFinding(
                        rule_id="STR-001",
                        dimension="structure",
                        criterion="heading_hierarchy",
                        status="requires_review",
                        message=(
                            "Se detectó un posible salto "
                            "en la jerarquía de títulos."
                        ),
                        page=element.get(
                            "page", page.get("page_number")
                        ),
                        evidence={
                            "previous_level": previous_level,
                            "current_level": level,
                            "previous_page": previous_page,
                            "current_heading": element.get("text", ""),
                        },
                    )
                )

            previous_level = level
            previous_page = element.get(
                "page", page.get("page_number")
            )

    return findings


def check_empty_pages(document: dict) -> list[RuleFinding]:
    """Report pages where no elements were extracted."""

    findings = []

    for page in document.get("pages", []):
        elements = page.get("elements", [])

        if elements:
            continue

        findings.append(
            RuleFinding(
                rule_id="STR-002",
                dimension="structure",
                criterion="page_content_extraction",
                status="informational",
                message=(
                    "La página no contiene elementos extraídos. "
                    "Se debe verificar si está vacía o si falló "
                    "la extracción del contenido."
                ),
                page=page.get("page_number"),
                evidence={
                    "elements_count": 0,
                },
            )
        )

    return findings