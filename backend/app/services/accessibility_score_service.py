
from collections.abc import Iterable, Mapping


SEVERITY_PENALTIES = {
    "high": 15,
    "medium": 7,
    "low": 3,
}

def calculate_accessibility_score(
    barriers: Iterable[Mapping[str, str]],
) -> int:
    """
    Calculate the accessibility score based on detected barriers.

    The score starts at 100 and decreases according to
    the severity of each detected barrier.

    Returns:
        An integer between 0 and 100.

    Raises:
        ValueError: If a barrier has an invalid severity.
    """

    total_penalty = 0

    for barrier in barriers:
        severity = barrier.get("severity")

        if severity not in SEVERITY_PENALTIES:
            raise ValueError(
                f"Invalid barrier severity: {severity}"
            )

        total_penalty += SEVERITY_PENALTIES[severity]

    return max(0, 100 - total_penalty)
