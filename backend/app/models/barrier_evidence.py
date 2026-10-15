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

    document_element_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "document_element.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
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

    document_element: Mapped["DocumentElement | None"] = (
        relationship(
            back_populates="barrier_evidences",
        )
    )