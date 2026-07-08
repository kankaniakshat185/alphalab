"""
alphalab.api.routers.experiments
================================
FastAPI routing endpoints for managing Research Experiments and Factors.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from alphalab.api.auth.jwt import get_current_user
from alphalab.api.database.connection import get_db_session
from alphalab.api.models.experiment import Experiment
from alphalab.api.models.factor import Factor
from alphalab.api.models.user import User
from alphalab.worker.tasks import run_backtest_task, run_robustness_task

router = APIRouter(prefix="/experiments", tags=["Experiments"])


def _get_experiment_options() -> tuple[Any, ...]:
    """Return common SQLAlchemy eager loading options for Experiments."""
    return (
        selectinload(Experiment.factors).selectinload(Factor.backtest_result),
        selectinload(Experiment.factors).selectinload(Factor.robustness_result),
    )

# --- Pydantic Schemas ---
class FactorIn(BaseModel):
    name: str = Field(..., min_length=1)
    formula: str = Field(..., min_length=1)


class ExperimentCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str | None = None
    factors: list[FactorIn] = Field(..., min_length=1)


class BacktestResultOut(BaseModel):
    sharpe: float | None = None
    sortino: float | None = None
    calmar: float | None = None
    max_drawdown: float | None = None
    turnover: float | None = None
    ic: float | None = None
    rank_ic: float | None = None

    model_config = {"from_attributes": True}


class RobustnessResultOut(BaseModel):
    noise_score: float | None = None
    missing_data_score: float | None = None
    overall_score: float | None = None
    failure_reasons: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class FactorOut(BaseModel):
    id: uuid.UUID
    name: str
    formula: str
    created_at: datetime
    backtest_result: BacktestResultOut | None = None
    robustness_result: RobustnessResultOut | None = None

    model_config = {"from_attributes": True}


class ExperimentOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    status: str
    created_at: datetime
    factors: list[FactorOut] = []

    model_config = {"from_attributes": True}


# --- Endpoints ---
@router.post("", response_model=ExperimentOut, status_code=status.HTTP_201_CREATED)
async def create_experiment(
    exp_in: ExperimentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> Experiment:
    """Submit a factor experiment, saving it and launching async analysis tasks.

    Args:
        exp_in: Experiment parameters and factor formulas.
        current_user: User submitting the job.
        db: Database session.

    Returns:
        The generated Experiment record.
    """
    if settings.MOCK_MODE:
        # MOCK RESPONSE FOR UI ITERATION
        new_exp = Experiment(
            id=uuid.uuid4(),
            user_id=current_user.id,
            name=exp_in.name,
            description=exp_in.description,
            status="COMPLETED",
            created_at=datetime.now(UTC),
        )
        
        factor_records = []
        for f in exp_in.factors:
            factor_records.append(Factor(
                id=uuid.uuid4(),
                experiment_id=new_exp.id,
                name=f.name,
                formula=f.formula,
                created_at=datetime.now(UTC),
                backtest_result=None,
                robustness_result=None
            ))
            
        new_exp.factors = factor_records
        return new_exp

    # 1. Create the Experiment record
    new_exp = Experiment(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=exp_in.name,
        description=exp_in.description,
        status="RUNNING",
        created_at=datetime.now(UTC),
    )
    db.add(new_exp)
    await db.flush()  # Flush to get the Experiment ID

    # 2. Add each Factor record
    factor_records = []
    for f in exp_in.factors:
        factor_rec = Factor(
            id=uuid.uuid4(),
            experiment_id=new_exp.id,
            name=f.name,
            formula=f.formula,
            created_at=datetime.now(UTC),
        )
        db.add(factor_rec)
        factor_records.append(factor_rec)

    await db.commit()
    await db.refresh(new_exp)

    # 3. Queue Celery jobs for backtesting and robustness checks
    for f_rec in factor_records:
        run_backtest_task.delay(str(f_rec.id))
        run_robustness_task.delay(str(f_rec.id))

    # Eagerly reload relationships to build output schemas correctly
    query = (
        select(Experiment)
        .options(*_get_experiment_options())
        .where(Experiment.id == new_exp.id)
    )
    result = await db.execute(query)
    reloaded_exp = result.scalar_one()

    return reloaded_exp


@router.get("", response_model=list[ExperimentOut])
async def list_experiments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> list[Experiment]:
    """Retrieve a list of all experiments submitted by the current user."""
    query = (
        select(Experiment)
        .options(*_get_experiment_options())
        .where(Experiment.user_id == current_user.id)
        .order_by(Experiment.created_at.desc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{experiment_id}", response_model=ExperimentOut)
async def get_experiment(
    experiment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> Experiment:
    """Retrieve the details and factor analysis status of a specific experiment."""
    query = (
        select(Experiment)
        .options(*_get_experiment_options())
        .where(Experiment.id == experiment_id, Experiment.user_id == current_user.id)
    )
    result = await db.execute(query)
    exp = result.scalar_one_or_none()

    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found or unauthorized",
        )

    return exp
