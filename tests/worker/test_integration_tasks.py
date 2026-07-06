"""
tests.worker.test_integration_tasks
===================================
Integration tests verifying real backtest execution and results writing.
"""

import os
import tempfile
import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest

from alphalab.api.models.factor import Factor
from alphalab.api.models.results import BacktestResult
from alphalab.common.types import MarketDataset, UniverseEntry
from alphalab.data.storage.duckdb import DuckDBStorage
from alphalab.worker.tasks import run_backtest_task


@pytest.fixture
def temp_duckdb():
    """Create a temporary DuckDB storage populated with sample prices."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test.duckdb")
    storage = DuckDBStorage(db_path=db_path)
    storage.initialize_schema()

    # Seed 2 days of OHLCV data for RELIANCE.NS and TCS.NS
    df = pd.DataFrame(
        {
            "ticker": ["RELIANCE.NS", "RELIANCE.NS", "TCS.NS", "TCS.NS"],
            "date": [
                date(2023, 1, 2),
                date(2023, 1, 3),
                date(2023, 1, 2),
                date(2023, 1, 3),
            ],
            "open": [100.0, 110.0, 200.0, 180.0],
            "high": [102.0, 112.0, 202.0, 182.0],
            "low": [98.0, 108.0, 198.0, 178.0],
            "close": [101.0, 111.0, 201.0, 179.0],
            "volume": [1000, 1100, 2000, 2100],
            "adj_close": [101.0, 111.0, 201.0, 179.0],
        }
    )
    storage.write_ohlcv(MarketDataset(df, date(2023, 1, 2), date(2023, 1, 3)))
    yield storage

    # Cleanup temp directory
    try:
        os.remove(db_path)
        os.rmdir(temp_dir)
    except OSError:
        pass


@pytest.mark.integration
@patch("alphalab.worker.tasks.async_session_maker")
@patch("alphalab.engine.runner.DuckDBStorage")
@patch("alphalab.engine.runner.NIFTY50Universe")
def test_backtest_task_integration_success(
    mock_universe_class: MagicMock,
    mock_storage_class: MagicMock,
    mock_session_maker: MagicMock,
    temp_duckdb: DuckDBStorage,
) -> None:
    """Verify that run_backtest_task executes real calculations and saves results."""
    # 1. Mock the DuckDB storage instance in tasks.py to use our temp seeded DB
    mock_storage_class.return_value = temp_duckdb

    # 2. Mock NIFTY50Universe point-in-time constituent resolver
    mock_universe = MagicMock()
    mock_universe.get_constituents.return_value = [
        UniverseEntry("RELIANCE.NS", "NIFTY50", date(2020, 1, 1), None),
        UniverseEntry("TCS.NS", "NIFTY50", date(2020, 1, 1), None),
    ]
    mock_universe_class.return_value = mock_universe

    # 3. Mock PostgreSQL async database session
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session_maker.return_value = mock_session
    mock_session.__aenter__.return_value = mock_session

    factor_id = uuid.uuid4()
    experiment_id = uuid.uuid4()
    mock_factor = Factor(
        id=factor_id,
        experiment_id=experiment_id,
        name="MOM_1",
        formula="Momentum(1)",  # Real DSL compile formula
    )

    mock_session.get.return_value = mock_factor

    # Mock checking previous results (None)
    mock_executor = MagicMock()
    mock_executor.scalar_one_or_none.return_value = None

    # Mock checking experiment completion status (returns mock factor)
    mock_factors_executor = MagicMock()
    mock_factors_executor.scalars.return_value.all.return_value = [mock_factor]

    mock_session.execute.side_effect = [mock_executor, mock_factors_executor]

    # 4. Trigger the task run
    run_backtest_task(str(factor_id))

    # Assert get factor query was made
    mock_session.get.assert_called_with(Factor, factor_id)

    # 5. Extract the added BacktestResult object to verify computed values
    added_obj = None
    for call in mock_session.add.call_args_list:
        obj = call[0][0]
        if isinstance(obj, BacktestResult):
            added_obj = obj
            break

    assert added_obj is not None
    assert added_obj.factor_id == factor_id

    # Sharpe/metrics should be computed from the sample price data, not mocked to 1.85 anymore!
    assert added_obj.sharpe is not None
    assert added_obj.max_drawdown is not None
    assert added_obj.ic is not None

    # Verify session was committed
    mock_session.commit.assert_called_once()
