import asyncio
import logging
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from alphalab.api.database.connection import async_session_maker
from alphalab.api.models.experiment import Experiment
from alphalab.api.models.factor import Factor
from alphalab.api.models.results import BacktestResult, RobustnessResult
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
    # Count total factors
    total_stmt = select(func.count(Factor.id)).where(
        Factor.experiment_id == experiment_id
    )
    total_factors = (await session.execute(total_stmt)).scalar() or 0

    # Count factors with both backtest and robustness results
    completed_stmt = select(func.count(Factor.id)).where(
        Factor.experiment_id == experiment_id,
        Factor.id.in_(select(BacktestResult.factor_id)),
        Factor.id.in_(select(RobustnessResult.factor_id)),
    )
    completed_factors = (await session.execute(completed_stmt)).scalar() or 0

    if total_factors > 0 and completed_factors >= total_factors:
        logger.info(
            f"[Celery] [Status] All factors analyzed ({completed_factors}/{total_factors}). Completing Experiment {experiment_id}"
        )
        stmt = (
            update(Experiment)
            .where(Experiment.id == experiment_id)
            .values(status="COMPLETED")
        )
        await session.execute(stmt)


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
                evaluator.run_robustness,
                factor.formula,
                tickers,
                start_date,
                end_date,
                baseline_sharpe,
            )

            # Generate and cache robustness verdict
            from alphalab.worker.verdicts import get_robustness_verdict

            v_robustness = get_robustness_verdict(
                res["overall_score"],
                baseline_sharpe or 0.0,
                res["overall_score"] * (baseline_sharpe or 0.0),
                res["failure_reasons"],
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
                    perturbation_grid=res["perturbation_grid"],
                    verdict_robustness=v_robustness,
                    stressed_equity_curve=res["stressed_equity_curve"],
                )
                session.add(r_res)
            else:
                r_res.noise_score = res["noise_score"]
                r_res.missing_data_score = res["missing_data_score"]
                r_res.overall_score = res["overall_score"]
                r_res.failure_reasons = res["failure_reasons"]
                r_res.perturbation_grid = res["perturbation_grid"]
                r_res.verdict_robustness = v_robustness
                r_res.stressed_equity_curve = res["stressed_equity_curve"]

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


_LOOP = None


def _run_coroutine_safely(coro):
    global _LOOP
    if _LOOP is None or _LOOP.is_closed():
        _LOOP = asyncio.new_event_loop()
        asyncio.set_event_loop(_LOOP)
    return _LOOP.run_until_complete(coro)


@celery_app.task  # type: ignore[untyped-decorator]
def run_backtest_task(factor_id: str) -> None:
    """Synchronous Celery task wrapper launching the asynchronous backtest worker."""
    _run_coroutine_safely(_run_backtest_async(factor_id))


@celery_app.task  # type: ignore[untyped-decorator]
def run_robustness_task(factor_id: str) -> None:
    """Synchronous Celery task wrapper launching the asynchronous robustness evaluation worker."""
    _run_coroutine_safely(_run_robustness_async(factor_id))
