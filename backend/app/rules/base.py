from dataclasses import asdict, dataclass
from typing import Literal


FindingStatus = Literal[
    "confirmed",
    "requires_review",
    "informational",
]


@dataclass
class RuleFinding:
    rule_id: str
    dimension: str
    criterion: str
    status: FindingStatus
    message: str
    evidence: dict
    page: int | None = None

    def to_dict(self) -> dict:
        return asdict(self)