
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Analysis(Base):
    __tablename__ = "analysis"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    material_id: Mapped[int] = mapped_column(
        ForeignKey("material.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="processing",
    )

    score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=50,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    barriers: Mapped[list["Barrier"]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
    )

    current_step: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="queued",
    )
