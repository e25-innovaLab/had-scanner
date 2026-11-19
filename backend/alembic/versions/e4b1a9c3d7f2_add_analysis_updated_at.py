"""add analysis updated_at heartbeat

Revision ID: e4b1a9c3d7f2
Revises: c1ac5ade7388
Create Date: 2026-11-19 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4b1a9c3d7f2'
down_revision: Union[str, Sequence[str], None] = 'c1ac5ade7388'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'analysis',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    # Filas existentes: el latido inicial es su fecha de creación, así que
    # los "processing" viejos quedan vencidos desde el inicio.
    op.execute("UPDATE analysis SET updated_at = created_at")
    op.alter_column(
        'analysis',
        'updated_at',
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('analysis', 'updated_at')
