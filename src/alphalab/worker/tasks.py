import asyncio
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from alphalab.api.database.connection import async_session_maker
from alphalab.api.models.experiment import Experiment
from alphalab.api.models.factor import Factor
from alphalab.api.models.results import RobustnessResult
from alphalab.data.storage.duckdb import DuckDBStorage
from alphalab.data.universe.nifty50 import NIFTY50Universe
from alphalab.engine.robustness import RobustnessEvaluator
from alphalab.engine.runner import ExperimentRunner
from alphalab.worker.celery import celery_app

logger = logging.getLogger("alphalab.worker.tasks")


async def _check_and_update_experiment_status_async(
    session: AsyncSession, experiment_id: uuid.UUID
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
    """Async execution routine to fetch factor details and run evaluation on DuckDB data."""
    logger.info(f"[Celery] [Backtest] Initiating backtest task for Factor {factor_id}")
    factor = None
    async with async_session_maker() as session:
        try:
            f_uuid = uuid.UUID(factor_id)
            factor = await session.get(Factor, f_uuid)
            if not factor:
                logger.error(
                    f"[Celery] [Backtest] Factor {factor_id} not found in database"
                )
                return

            # Delegate backtest execution to the domain service
            await ExperimentRunner.run_backtest(factor, session)
            await _check_and_update_experiment_status_async(
                session, factor.experiment_id
            )
            await session.commit()
            logger.info(
                f"[Celery] [Backtest] Finished backtest task successfully for Factor {factor_id}"
            )
        except Exception as e:
            logger.error(f"[Celery] [Backtest] Task failed for Factor {factor_id}: {e}")
            await session.rollback()
            if factor:
                try:
                    exp = await session.get(Experiment, factor.experiment_id)
                    if exp:
                        exp.status = "FAILED"
                        await session.commit()
                except Exception as db_err:
                    logger.error(
                        f"[Celery] [Backtest] Failed to set experiment status to FAILED: {db_err}"
                    )
            raise e


async def _run_robustness_async(factor_id: str) -> None:
    """Async execution routine to fetch factor details and save robustness scores."""
    logger.info(
        f"[Celery] [Robustness] Initiating robustness task for Factor {factor_id}"
    )
    factor = None
    async with async_session_maker() as session:
        try:
            f_uuid = uuid.UUID(factor_id)
            # Load factor with backtest_result pre-loaded to access baseline Sharpe ratio
            factor = await session.get(
                Factor, f_uuid, options=[selectinload(Factor.backtest_result)]
            )
            if not factor:
                logger.error(
                    f"[Celery] [Robustness] Factor {factor_id} not found in database"
                )
                return

            # Resolve universe tickers to test on
            storage = DuckDBStorage()
            start_date, end_date = storage.get_available_date_range()
            universe = NIFTY50Universe()
            constituents = universe.get_constituents(end_date)
            tickers = [c.ticker for c in constituents]

            baseline_sharpe = (
                factor.backtest_result.sharpe if factor.backtest_result else None
            )
            evaluator = RobustnessEvaluator(base_storage=storage)
            res = await asyncio.to_thread(
                evaluator.run_robustness, factor.formula, tickers, start_date, end_date, baseline_sharpe
            )

            # Check if robustness result already exists to avoid unique constraint violations
            stmt = select(RobustnessResult).where(RobustnessResult.factor_id == f_uuid)
            db_res = await session.execute(stmt)
            r_res = db_res.scalar_one_or_none()

            if not r_res:
                r_res = RobustnessResult(
                    factor_id=f_uuid,
                    noise_score=res["noise_score"],
                    missing_data_score=res["missing_data_score"],
                    overall_score=res["overall_score"],
                    failure_reasons=res["failure_reasons"],
                )
                session.add(r_res)
            else:
                r_res.noise_score = res["noise_score"]
                r_res.missing_data_score = res["missing_data_score"]
                r_res.overall_score = res["overall_score"]
                r_res.failure_reasons = res["failure_reasons"]

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
            if factor:
                try:
                    exp = await session.get(Experiment, factor.experiment_id)
                    if exp:
                        exp.status = "FAILED"
                        await session.commit()
                except Exception as db_err:
                    logger.error(
                        f"[Celery] [Robustness] Failed to set experiment status to FAILED: {db_err}"
                    )
            raise e


@celery_app.task  # type: ignore[untyped-decorator]
def run_backtest_task(factor_id: str) -> None:
    """Synchronous Celery task wrapper launching the asynchronous backtest worker."""
    asyncio.run(_run_backtest_async(factor_id))


@celery_app.task  # type: ignore[untyped-decorator]
def run_robustness_task(factor_id: str) -> None:
    """Synchronous Celery task wrapper launching the asynchronous robustness worker."""
    asyncio.run(_run_robustness_async(factor_id))
