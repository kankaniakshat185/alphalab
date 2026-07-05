"""
alphalab.worker.tasks
=====================
Defines Celery tasks for backtesting and robustness analysis.
"""

import asyncio
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from alphalab.api.database.connection import async_session_maker
from alphalab.api.models.experiment import Experiment
from alphalab.api.models.factor import Factor
from alphalab.api.models.results import BacktestResult, RobustnessResult
from alphalab.worker.celery import celery_app

logger = logging.getLogger("alphalab.worker.tasks")


async def _check_and_update_experiment_status_async(
    session, experiment_id: uuid.UUID
) -> None:
    """Helper query checking if all factors in the experiment have completed analysis."""
    # Fetch all factors and load their results
    stmt = (
        select(Factor)
        .options(
            selectinload(Factor.backtest_result),
            selectinload(Factor.robustness_result),
        )
        .where(Factor.experiment_id == experiment_id)
    )
    result = await session.execute(stmt)
    factors = result.scalars().all()

    # If all factors have both results, the experiment is finished
    all_done = True
    for f in factors:
        # Check if the results exist in session or database
        has_backtest = f.backtest_result is not None
        has_robustness = f.robustness_result is not None
        if not (has_backtest and has_robustness):
            all_done = False
            break

    if all_done:
        logger.info(
            f"[Celery] [Status] All factors analyzed. Completing Experiment {experiment_id}"
        )
        exp = await session.get(Experiment, experiment_id)
        if exp:
            exp.status = "COMPLETED"


async def _run_backtest_async(factor_id: str) -> None:
    """Async execution routine to fetch factor details and save mock backtest metrics."""
    logger.info(f"[Celery] [Backtest] Initiating backtest task for Factor {factor_id}")
    async with async_session_maker() as session:
        try:
            f_uuid = uuid.UUID(factor_id)
            factor = await session.get(Factor, f_uuid)
            if not factor:
                logger.error(
                    f"[Celery] [Backtest] Factor {factor_id} not found in database"
                )
                return

            # Check if backtest result already exists to avoid unique constraint violations
            stmt = select(BacktestResult).where(BacktestResult.factor_id == f_uuid)
            res = await session.execute(stmt)
            b_res = res.scalar_one_or_none()

            if not b_res:
                # Save mock backtesting metrics
                b_res = BacktestResult(
                    factor_id=f_uuid,
                    sharpe=1.85,
                    sortino=2.12,
                    calmar=1.45,
                    max_drawdown=0.12,
                    turnover=0.04,
                    ic=0.08,
                    rank_ic=0.07,
                )
                session.add(b_res)
            else:
                b_res.sharpe = 1.85
                b_res.max_drawdown = 0.12

            await session.flush()
            await _check_and_update_experiment_status_async(
                session, factor.experiment_id
            )
            await session.commit()
            logger.info(
                f"[Celery] [Backtest] Finished backtest task for Factor {factor_id}"
            )
        except Exception as e:
            logger.error(f"[Celery] [Backtest] Task failed for Factor {factor_id}: {e}")
            await session.rollback()


async def _run_robustness_async(factor_id: str) -> None:
    """Async execution routine to fetch factor details and save mock robustness scores."""
    logger.info(
        f"[Celery] [Robustness] Initiating robustness task for Factor {factor_id}"
    )
    async with async_session_maker() as session:
        try:
            f_uuid = uuid.UUID(factor_id)
            factor = await session.get(Factor, f_uuid)
            if not factor:
                logger.error(
                    f"[Celery] [Robustness] Factor {factor_id} not found in database"
                )
                return

            # Check if robustness result already exists to avoid unique constraint violations
            stmt = select(RobustnessResult).where(RobustnessResult.factor_id == f_uuid)
            res = await session.execute(stmt)
            r_res = res.scalar_one_or_none()

            if not r_res:
                # Save mock robustness metrics
                r_res = RobustnessResult(
                    factor_id=f_uuid,
                    noise_score=0.82,
                    missing_data_score=0.91,
                    overall_score=0.86,
                    failure_reasons={},
                )
                session.add(r_res)
            else:
                r_res.overall_score = 0.86
                r_res.noise_score = 0.82

            await session.flush()
            await _check_and_update_experiment_status_async(
                session, factor.experiment_id
            )
            await session.commit()
            logger.info(
                f"[Celery] [Robustness] Finished robustness task for Factor {factor_id}"
            )
        except Exception as e:
            logger.error(
                f"[Celery] [Robustness] Task failed for Factor {factor_id}: {e}"
            )
            await session.rollback()


@celery_app.task
def run_backtest_task(factor_id: str) -> None:
    """Synchronous Celery task wrapper launching the asynchronous backtest worker."""
    asyncio.run(_run_backtest_async(factor_id))


@celery_app.task
def run_robustness_task(factor_id: str) -> None:
    """Synchronous Celery task wrapper launching the asynchronous robustness worker."""
    asyncio.run(_run_robustness_async(factor_id))
