"""
tests.worker.test_tasks
=======================
Unit tests for Celery task handlers and database result writes using mocks.
"""

import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from alphalab.api.models.factor import Factor
from alphalab.api.models.results import BacktestResult, RobustnessResult
from alphalab.worker.tasks import run_backtest_task, run_robustness_task


@pytest.mark.unit
@patch("alphalab.worker.tasks.async_session_maker")
@patch("alphalab.engine.runner.compile_factor")
@patch("alphalab.engine.runner.DuckDBStorage")
@patch("alphalab.engine.runner.NIFTY50Universe")
@patch("alphalab.engine.runner.FactorEvaluator")
@patch("alphalab.engine.runner.PortfolioConstructor")
@patch("alphalab.engine.runner.PerformanceCalculator")
def test_run_backtest_task_success(
    mock_perf_calc: MagicMock,
    mock_portfolio: MagicMock,
    mock_evaluator_class: MagicMock,
    mock_universe_class: MagicMock,
    mock_storage_class: MagicMock,
    mock_compile_factor: MagicMock,
    mock_session_maker: MagicMock,
) -> None:
    """Verify that the backtest task inserts results and updates database tables."""
    # Mock database session
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session_maker.return_value = mock_session
    mock_session.__aenter__.return_value = mock_session

    factor_id = uuid.uuid4()
    mock_factor = Factor(
        id=factor_id,
        experiment_id=uuid.uuid4(),
        name="MOM_10",
        formula="Momentum(10)",
    )

    mock_session.get.return_value = mock_factor

    # Mock checking previous results (return None for no duplicate)
    mock_executor = MagicMock()
    mock_executor.scalar_one_or_none.return_value = None

    # Mock resolving experiment completion (return no other factors)
    mock_factors_executor = MagicMock()
    mock_factors_executor.scalars.return_value.all.return_value = [mock_factor]

    mock_session.execute.side_effect = [mock_executor, mock_factors_executor]

    # Mock storage connections
    mock_storage = MagicMock()
    mock_storage_class.return_value = mock_storage
    from datetime import date

    mock_storage.get_available_date_range.return_value = (
        date(2023, 1, 1),
        date(2023, 1, 10),
    )

    # Mock Evaluator, Universe, Portfolio, and PerformanceCalculator outputs to return mock values
    mock_universe = MagicMock()
    mock_universe_class.return_value = mock_universe
    mock_universe.get_constituents.return_value = [MagicMock(ticker="AAPL")]

    mock_evaluator = MagicMock()
    mock_evaluator_class.return_value = mock_evaluator
    mock_evaluator.evaluate.return_value = MagicMock()

    mock_portfolio.signals_to_weights.return_value = MagicMock()
    mock_perf_calc.compute_returns.return_value = MagicMock()
    mock_perf_calc.calculate_metrics.return_value = {
        "sharpe": 1.85,
        "max_drawdown": 0.12,
        "ic": 0.08,
    }

    # Trigger the task
    run_backtest_task(str(factor_id))

    # Assert database operations were executed
    mock_session.get.assert_called_with(Factor, factor_id)

    # Verify a BacktestResult record was added to session
    added_obj = None
    for call in mock_session.add.call_args_list:
        obj = call[0][0]
        if isinstance(obj, BacktestResult):
            added_obj = obj
            break

    assert added_obj is not None
    assert added_obj.factor_id == factor_id
    assert added_obj.sharpe == 1.85

    # Verify session was committed
    mock_session.commit.assert_called_once()


@pytest.mark.unit
@patch("alphalab.worker.tasks.async_session_maker")
@patch("alphalab.worker.tasks.RobustnessEvaluator")
@patch("alphalab.worker.tasks.DuckDBStorage")
@patch("alphalab.worker.tasks.NIFTY50Universe")
def test_run_robustness_task_success(
    mock_universe_class: MagicMock,
    mock_storage_class: MagicMock,
    mock_robustness_evaluator_class: MagicMock,
    mock_session_maker: MagicMock,
) -> None:
    """Verify that the robustness task inserts results and updates database tables."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session_maker.return_value = mock_session
    mock_session.__aenter__.return_value = mock_session

    factor_id = uuid.uuid4()
    mock_factor = Factor(
        id=factor_id,
        experiment_id=uuid.uuid4(),
        name="MOM_10",
        formula="Momentum(10)",
    )

    # Mock session.get returning the mock factor
    mock_session.get.return_value = mock_factor

    # Mock storage and universe
    mock_storage = MagicMock()
    mock_storage_class.return_value = mock_storage
    mock_storage.get_available_date_range.return_value = (date(2023, 1, 1), date(2023, 1, 10))

    mock_universe = MagicMock()
    mock_universe_class.return_value = mock_universe
    mock_universe.get_constituents.return_value = [MagicMock(ticker="AAPL")]

    # Mock RobustnessEvaluator output
    mock_evaluator = MagicMock()
    mock_robustness_evaluator_class.return_value = mock_evaluator
    mock_evaluator.run_robustness.return_value = {
        "noise_score": 0.82,
        "missing_data_score": 0.91,
        "overall_score": 0.86,
        "failure_reasons": {},
    }

    # Mock checking previous results
    mock_executor = MagicMock()
    mock_executor.scalar_one_or_none.return_value = None

    # Mock resolving experiment completion
    mock_factors_executor = MagicMock()
    mock_factors_executor.scalars.return_value.all.return_value = [mock_factor]

    mock_session.execute.side_effect = [mock_executor, mock_factors_executor]

    # Trigger the task
    run_robustness_task(str(factor_id))

    # Assert database operations were executed
    assert mock_session.get.call_count == 1
    assert mock_session.get.call_args[0] == (Factor, factor_id)

    # Verify a RobustnessResult record was added to session
    added_obj = None
    for call in mock_session.add.call_args_list:
        obj = call[0][0]
        if isinstance(obj, RobustnessResult):
            added_obj = obj
            break

    assert added_obj is not None
    assert added_obj.factor_id == factor_id
    assert added_obj.overall_score == 0.86

    # Verify session was committed
    mock_session.commit.assert_called_once()
