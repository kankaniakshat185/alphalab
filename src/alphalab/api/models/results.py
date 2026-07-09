"""
alphalab.api.models.results
===========================
Defines the database schema mapping for Factor Backtesting and Stress Results.
"""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from alphalab.api.models.base import Base

if TYPE_CHECKING:
    from alphalab.api.models.factor import Factor


class BacktestResult(Base):
    """BacktestResult database model representation."""

    __tablename__ = "backtest_results"

    factor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("factors.id", ondelete="CASCADE"),
        primary_key=True,
    )
    sharpe: Mapped[float | None] = mapped_column(Float, nullable=True)
    sortino: Mapped[float | None] = mapped_column(Float, nullable=True)
    calmar: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[float | None] = mapped_column(Float, nullable=True)
    turnover: Mapped[float | None] = mapped_column(Float, nullable=True)
    ic: Mapped[float | None] = mapped_column(Float, nullable=True)
    rank_ic: Mapped[float | None] = mapped_column(Float, nullable=True)
    equity_curve: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, nullable=True
    )

    # Added columns for LLM verdicts and math breakdowns
    verdict_sharpe: Mapped[str | None] = mapped_column(String, nullable=True)
    verdict_ic: Mapped[str | None] = mapped_column(String, nullable=True)
    verdict_mdd: Mapped[str | None] = mapped_column(String, nullable=True)
    daily_mean: Mapped[float | None] = mapped_column(Float, nullable=True)
    daily_std: Mapped[float | None] = mapped_column(Float, nullable=True)
    mdd_peak_date: Mapped[str | None] = mapped_column(String, nullable=True)
    mdd_trough_date: Mapped[str | None] = mapped_column(String, nullable=True)

    # Relationship
    factor: Mapped["Factor"] = relationship("Factor", back_populates="backtest_result")


class RobustnessResult(Base):
    """RobustnessResult database model representation."""

    __tablename__ = "robustness_results"

    factor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("factors.id", ondelete="CASCADE"),
        primary_key=True,
    )
    noise_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    missing_data_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    failure_reasons: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    perturbation_grid: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, nullable=True
    )

    # Added columns for robustness verdict and real stress testing curves
    verdict_robustness: Mapped[str | None] = mapped_column(String, nullable=True)
    stressed_equity_curve: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, nullable=True
    )

    # Relationship
    factor: Mapped["Factor"] = relationship(
        "Factor", back_populates="robustness_result"
    )
