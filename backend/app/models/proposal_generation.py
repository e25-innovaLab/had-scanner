from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ProposalGeneration(Base):
    """Tracks an in-flight AI proposal generation for cancellation."""

    __tablename__ = "proposal_generation"

    barrier_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("barrier.id", ondelete="CASCADE"),
        primary_key=True,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    cancel_requested: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
