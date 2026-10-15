from typing import Any

from sqlalchemy import (
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class DocumentElement(Base):
    __tablename__ = "document_element"

    __table_args__ = (
        UniqueConstraint(
            "analysis_id",
            "element_id",
            name="uq_document_element_analysis_element",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("analysis.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    element_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    page: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    heading_level: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    order_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    bbox: Mapped[dict[str, Any] | list[float] | None] = (
        mapped_column(JSON, nullable=True)
    )

    analysis: Mapped["Analysis"] = relationship(
        back_populates="document_elements",
    )

    barrier_evidences: Mapped[list["BarrierEvidence"]] = (
        relationship(
            back_populates="document_element",
        )
    )