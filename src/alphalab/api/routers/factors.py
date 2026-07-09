"""
alphalab.api.routers.factors
============================
FastAPI routing endpoints for retrieving Factor Leaderboards and Details.
"""

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from alphalab.api.database.connection import get_db_session
from alphalab.api.models.factor import Factor
from alphalab.api.models.results import BacktestResult, RobustnessResult

router = APIRouter(prefix="/factors", tags=["Factors"])

# --- Response DTOs ---


class LeaderboardFactor(BaseModel):
    id: uuid.UUID
    name: str
    formula: str
    created_at: datetime
    sharpe: float | None = None
    ic: float | None = None
    overall_score: float | None = None


class LeaderboardResponse(BaseModel):
    items: list[LeaderboardFactor]
    total_count: int
    page: int
    page_size: int


class FactorDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    formula: str
    created_at: datetime
    metrics: dict[str, float | None]
    status: str
    verdict_sharpe: str | None = None
    verdict_ic: str | None = None
    verdict_mdd: str | None = None
    verdict_robustness: str | None = None
    daily_mean: float | None = None
    daily_std: float | None = None
    mdd_peak_date: str | None = None
    mdd_trough_date: str | None = None
    dominant_failure: str | None = None
    explanation: str | None = None
    recommendations: list[str] = []


class BacktestResponse(BaseModel):
    equity_curve: list[dict[str, Any]]


class RobustnessResponse(BaseModel):
    overall_score: float | None = None
    dominant_failure: str | None = None
    explanation: str | None = None
    recommendations: list[str] = []
    grid: list[dict[str, Any]] = []
    stressed_equity_curve: list[dict[str, Any]] | None = None


# --- Endpoints ---


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("overall_score", pattern="^(overall_score|sharpe|ic)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db_session),
) -> LeaderboardResponse:
    """Retrieve the factor leaderboard sorted by the specified metric."""

    # 1. Total Count
    count_stmt = select(func.count(Factor.id))
    total_count = await db.scalar(count_stmt) or 0

    # 2. Build Query
    stmt = (
        select(Factor)
        .options(
            selectinload(Factor.backtest_result), selectinload(Factor.robustness_result)
        )
        .outerjoin(BacktestResult, Factor.id == BacktestResult.factor_id)
        .outerjoin(RobustnessResult, Factor.id == RobustnessResult.factor_id)
    )

    # 3. Sorting
    sort_column = None
    if sort == "sharpe":
        sort_column = BacktestResult.sharpe
    elif sort == "ic":
        sort_column = BacktestResult.ic
    elif sort == "overall_score":
        sort_column = RobustnessResult.overall_score

    if sort_column is not None:
        if order == "desc":
            stmt = stmt.order_by(desc(sort_column).nulls_last())
        else:
            stmt = stmt.order_by(sort_column.nulls_last())

    # 4. Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await db.execute(stmt)
    factors = result.scalars().all()

    # 5. Map to DTO
    items = []
    for f in factors:
        b_res = f.backtest_result
        r_res = f.robustness_result
        items.append(
            LeaderboardFactor(
                id=f.id,
                name=f.name,
                formula=f.formula,
                created_at=f.created_at,
                sharpe=b_res.sharpe if b_res else None,
                ic=b_res.ic if b_res else None,
                overall_score=r_res.overall_score if r_res else None,
            )
        )

    return LeaderboardResponse(
        items=items,
        total_count=total_count,
        page=page,
        page_size=page_size,
    )


@router.get("/{factor_id}", response_model=FactorDetailResponse)
async def get_factor_details(
    factor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> FactorDetailResponse:
    """Retrieve basic metadata and scalar metrics for a factor."""
    stmt = (
        select(Factor)
        .options(
            selectinload(Factor.experiment),
            selectinload(Factor.backtest_result),
            selectinload(Factor.robustness_result),
        )
        .where(Factor.id == factor_id)
    )
    result = await db.execute(stmt)
    factor = result.scalar_one_or_none()

    if not factor:
        raise HTTPException(status_code=404, detail="Factor not found")

    metrics = {}
    if factor.backtest_result:
        metrics = {
            "sharpe": factor.backtest_result.sharpe,
            "sortino": factor.backtest_result.sortino,
            "calmar": factor.backtest_result.calmar,
            "max_drawdown": factor.backtest_result.max_drawdown,
            "turnover": factor.backtest_result.turnover,
            "ic": factor.backtest_result.ic,
            "rank_ic": factor.backtest_result.rank_ic,
        }

    if factor.robustness_result:
        metrics["overall_score"] = factor.robustness_result.overall_score

    b_res = factor.backtest_result
    r_res = factor.robustness_result
    reasons = r_res.failure_reasons or {} if r_res else {}

    return FactorDetailResponse(
        id=factor.id,
        name=factor.name,
        formula=factor.formula,
        created_at=factor.created_at,
        metrics=metrics,
        status=factor.experiment.status if factor.experiment else "UNKNOWN",
        verdict_sharpe=b_res.verdict_sharpe if b_res else None,
        verdict_ic=b_res.verdict_ic if b_res else None,
        verdict_mdd=b_res.verdict_mdd if b_res else None,
        verdict_robustness=r_res.verdict_robustness if r_res else None,
        daily_mean=b_res.daily_mean if b_res else None,
        daily_std=b_res.daily_std if b_res else None,
        mdd_peak_date=b_res.mdd_peak_date if b_res else None,
        mdd_trough_date=b_res.mdd_trough_date if b_res else None,
        dominant_failure=reasons.get("dominant_failure"),
        explanation=reasons.get("explanation"),
        recommendations=reasons.get("recommendations", []),
    )


@router.get("/{factor_id}/backtest", response_model=BacktestResponse)
async def get_factor_backtest(
    factor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> BacktestResponse:
    """Retrieve the equity curve for a factor."""
    stmt = select(BacktestResult).where(BacktestResult.factor_id == factor_id)
    result = await db.execute(stmt)
    b_res = result.scalar_one_or_none()

    if not b_res:
        raise HTTPException(status_code=404, detail="Backtest result not found")

    return BacktestResponse(equity_curve=b_res.equity_curve or [])


@router.get("/{factor_id}/robustness", response_model=RobustnessResponse)
async def get_factor_robustness(
    factor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
) -> RobustnessResponse:
    """Retrieve the robustness grid and failure analysis for a factor."""
    stmt = select(RobustnessResult).where(RobustnessResult.factor_id == factor_id)
    result = await db.execute(stmt)
    r_res = result.scalar_one_or_none()

    if not r_res:
        raise HTTPException(status_code=404, detail="Robustness result not found")

    reasons = r_res.failure_reasons or {}
    return RobustnessResponse(
        overall_score=r_res.overall_score,
        dominant_failure=reasons.get("dominant_failure"),
        explanation=reasons.get("explanation"),
        recommendations=reasons.get("recommendations", []),
        grid=r_res.perturbation_grid or [],
        stressed_equity_curve=r_res.stressed_equity_curve or [],
    )
