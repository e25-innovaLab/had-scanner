"""add finalized_document status for soft-delete

Revision ID: a1b2c3d4e5f6
Revises: f8c2e1a04b9d
Create Date: 2026-11-25 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f8c2e1a04b9d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "finalized_document",
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="available",
        ),
    )


def downgrade() -> None:
    op.drop_column("finalized_document", "status")
