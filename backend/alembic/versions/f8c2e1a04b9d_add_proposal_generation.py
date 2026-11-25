"""add proposal_generation for cancelable AI proposals

Revision ID: f8c2e1a04b9d
Revises: e4b1a9c3d7f2
Create Date: 2026-11-25 13:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8c2e1a04b9d"
down_revision: Union[str, Sequence[str], None] = "e4b1a9c3d7f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "proposal_generation",
        sa.Column("barrier_id", sa.Integer(), nullable=False),
        sa.Column("generation_token", sa.String(length=36), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "cancel_requested",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.ForeignKeyConstraint(
            ["barrier_id"],
            ["barrier.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("barrier_id"),
    )


def downgrade() -> None:
    op.drop_table("proposal_generation")
