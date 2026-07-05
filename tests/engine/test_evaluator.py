"""Tests for the Factor Evaluator."""

from datetime import date
from unittest.mock import MagicMock

import pandas as pd
import pytest

from alphalab.common.exceptions import DataError
from alphalab.common.types import MarketDataset
from alphalab.engine.evaluator import FactorEvaluator


@pytest.fixture
def mock_storage():
    """Mock storage returning a simple dataset."""
    storage = MagicMock()
    df = pd.DataFrame(
        {
            "ticker": ["AAPL", "AAPL", "MSFT", "MSFT"],
            "date": [
                date(2023, 1, 1),
                date(2023, 1, 2),
                date(2023, 1, 1),
                date(2023, 1, 2),
            ],
            "open": [100, 101, 200, 201],
            "high": [102, 103, 202, 203],
            "low": [99, 100, 199, 200],
            "close": [101, 102, 201, 202],
            "volume": [1000, 1100, 2000, 2100],
            "adj_close": [101.0, 102.0, 201.0, 202.0],
        }
    )
    storage.read_ohlcv.return_value = MarketDataset(
        data=df, start_date=date(2023, 1, 1), end_date=date(2023, 1, 2)
    )
    return storage


def test_evaluator_basic(mock_storage):
    """Test evaluating a simple factor function."""
    evaluator = FactorEvaluator(mock_storage)

    # Simple factor: df['Price'] * 2
    def mock_factor(df: pd.DataFrame) -> pd.Series:
        return df["Price"] * 2

    tickers = ["AAPL", "MSFT"]
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 2)

    result = evaluator.evaluate(mock_factor, tickers, start_date, end_date)

    assert not result.empty
    assert list(result.columns) == ["date", "ticker", "signal"]
    assert len(result) == 4

    aapl_signals = result[result["ticker"] == "AAPL"]["signal"].tolist()
    assert aapl_signals == [202.0, 204.0]  # adj_close * 2


def test_evaluator_no_data(mock_storage):
    """Test evaluator handles empty data."""
    mock_storage.read_ohlcv.return_value = MarketDataset(
        data=pd.DataFrame(columns=["ticker", "date", "open", "high", "low", "close", "volume", "adj_close"]),
        start_date=date(2023, 1, 1),
        end_date=date(2023, 1, 2)
    )
    evaluator = FactorEvaluator(mock_storage)

    with pytest.raises(DataError, match="No OHLCV data found"):
        evaluator.evaluate(lambda df: df["Price"], ["AAPL"], date(2023, 1, 1), date(2023, 1, 2))


def test_evaluator_drops_nans(mock_storage):
    """Test evaluator drops NaN signals (e.g. from shift/rolling)."""
    evaluator = FactorEvaluator(mock_storage)

    # Factor: pct_change creates NaN on the first row
    def mock_factor(df: pd.DataFrame) -> pd.Series:
        return df["Price"].pct_change()

    result = evaluator.evaluate(mock_factor, ["AAPL", "MSFT"], date(2023, 1, 1), date(2023, 1, 2))

    assert len(result) == 2  # 1 row per ticker instead of 2 (first row dropped)
    assert pd.isna(result["signal"]).sum() == 0
