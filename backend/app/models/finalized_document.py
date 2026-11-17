
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class FinalizedDocument(Base):
    __tablename__ = "finalized_document"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    material_id: Mapped[int] = mapped_column(
        ForeignKey("material.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    material: Mapped["Material"] = relationship(
        back_populates="finalized_documents",
    )
