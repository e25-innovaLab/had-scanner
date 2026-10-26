from datetime import datetime
from sqlalchemy import DateTime, String, func, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base

class AdaptationProposal(Base):
    __tablename__ = "adaptation_proposal"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    barrier_id: Mapped[int] = mapped_column(
        ForeignKey("barrier.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
    )

    original_content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    proposed_content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    barrier: Mapped["Barrier"] = relationship(
        back_populates="proposals",
    )