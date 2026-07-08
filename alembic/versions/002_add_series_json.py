"""Add structured json arrays to results tables

Revision ID: 002_add_series_json
Revises: 001_initial_schema
Create Date: 2026-07-08 20:34:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_add_series_json"
down_revision: str | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("backtest_results", sa.Column("equity_curve", sa.JSON(), nullable=True))
    op.add_column("robustness_results", sa.Column("perturbation_grid", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("robustness_results", "perturbation_grid")
    op.drop_column("backtest_results", "equity_curve")
