
from sqlalchemy import (
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class BarrierEvidence(Base):
    __tablename__ = "barrier_evidence"

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

    element_id: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    page: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    element_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    anchor: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    context_role: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    match_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
    )

    barrier: Mapped["Barrier"] = relationship(
        back_populates="evidences",
    )
