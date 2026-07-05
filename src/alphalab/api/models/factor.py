"""
alphalab.api.models.factor
==========================
Defines the database schema mapping for Factor definitions.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from alphalab.api.models.base import Base

if TYPE_CHECKING:
    from alphalab.api.models.experiment import Experiment
    from alphalab.api.models.results import BacktestResult, RobustnessResult


class Factor(Base):
    """Factor database model representation."""

    __tablename__ = "factors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    experiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    formula: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    experiment: Mapped["Experiment"] = relationship(
        "Experiment", back_populates="factors"
    )
    backtest_result: Mapped[Optional["BacktestResult"]] = relationship(
        "BacktestResult",
        back_populates="factor",
        uselist=False,
        cascade="all, delete-orphan",
    )
    robustness_result: Mapped[Optional["RobustnessResult"]] = relationship(
        "RobustnessResult",
        back_populates="factor",
        uselist=False,
        cascade="all, delete-orphan",
    )
