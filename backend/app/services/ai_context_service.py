
def build_ai_context(document: dict, rule_analysis: dict) -> dict:
    """Build the AI context required by the detected rule criteria."""

    findings = rule_analysis.get("findings", [])

    context = {}

    # Build heading hierarchy context only when the criterion
    # was detected by the rule engine.
    has_heading_hierarchy_finding = any(
        finding.get("criterion") == "heading_hierarchy"
        for finding in findings
    )

    if has_heading_hierarchy_finding:
        headings = []
        heading_index = 0

        for page in document.get("pages", []):
            page_number = page.get("page_number")

            for element in page.get("elements", []):
                if element.get("type") not in {"heading", "title"}:
                    continue

                heading_index += 1

                headings.append({
                    "heading_id": f"H-{heading_index:03d}",
                    "page": element.get("page", page_number),
                    "text": element.get("text", ""),
                    "heading_level": element.get("heading_level"),
                })

        context["heading_hierarchy"] = {
            "page_count": document.get("page_count", 0),
            "headings_count": len(headings),
            "headings": headings,
        }

    return context
