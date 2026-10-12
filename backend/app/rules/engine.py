from app.rules.base import RuleFinding
from app.rules.structure import (
    check_empty_pages,
    check_heading_hierarchy,
)
from app.rules.comprehension import check_long_paragraphs


def run_rules(document: dict) -> dict:
    """Execute deterministic accessibility checks."""

    findings: list[RuleFinding] = []

    rules = [
        check_heading_hierarchy,
        check_empty_pages,
        check_long_paragraphs,
    ]

    for rule in rules:
        findings.extend(rule(document))

    results = [finding.to_dict() for finding in findings]

    return {
        "findings": results,
        "summary": {
            "total_findings": len(results),
            "confirmed": sum(
                finding["status"] == "confirmed"
                for finding in results
            ),
            "requires_review": sum(
                finding["status"] == "requires_review"
                for finding in results
            ),
            "informational": sum(
                finding["status"] == "informational"
                for finding in results
            ),
        },
    }