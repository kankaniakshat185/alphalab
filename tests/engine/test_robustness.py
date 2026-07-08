"""Tests for the Robustness Engine."""

from datetime import date
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from alphalab.common.types import MarketDataset, UniverseEntry
from alphalab.engine.robustness import (
    PerturbedStorage,
    RobustnessEvaluator,
    perturb_gaussian,
    perturb_missing_data,
)


@pytest.fixture
def sample_price_df():
    """Create a sample pricing DataFrame for testing perturbations."""
    return pd.DataFrame(
        {
            "ticker": ["AAPL"] * 20 + ["MSFT"] * 20,
            "date": [date(2023, 1, i) for i in range(1, 21)] * 2,
            "open": [100.0 + i for i in range(20)] * 2,
            "high": [105.0 + i for i in range(20)] * 2,
            "low": [95.0 + i for i in range(20)] * 2,
            "close": [101.0 + i for i in range(20)] * 2,
            "volume": [1000.0] * 40,
            "adj_close": [101.0 + i for i in range(20)] * 2,
        }
    )


def test_perturb_gaussian_basic(sample_price_df):
    """Test that Gaussian noise is applied to price columns and values change."""
    noise_level = 0.05
    perturbed = perturb_gaussian(sample_price_df, noise_level)

    assert not perturbed.empty
    assert len(perturbed) == len(sample_price_df)

    # Prices should be different from original
    assert not (perturbed["close"] == sample_price_df["close"]).all()
    # High should be >= open, close, and low
    assert (perturbed["high"] >= perturbed[["open", "close", "low"]].max(axis=1)).all()
    # Low should be <= open, close, and high
    assert (perturbed["low"] <= perturbed[["open", "close", "high"]].min(axis=1)).all()
    # Volume should be perturbed and positive
    assert not (perturbed["volume"] == sample_price_df["volume"]).all()
    assert (perturbed["volume"] >= 1.0).all()


def test_perturb_gaussian_empty():
    """Test Gaussian noise function handles empty DataFrame."""
    empty_df = pd.DataFrame()
    perturbed = perturb_gaussian(empty_df, 0.01)
    assert perturbed.empty


def test_perturb_missing_data_basic(sample_price_df):
    """Test that missing data simulation drops approximately the target percentage of rows."""
    drop_rate = 0.20  # 20%
    perturbed = perturb_missing_data(sample_price_df, drop_rate, chunk_size=2)

    assert not perturbed.empty
    # Expect 40 * (1 - 0.20) = 32 rows
    assert len(perturbed) == 32


def test_perturb_missing_data_empty():
    """Test missing data function handles empty DataFrame."""
    empty_df = pd.DataFrame()
    perturbed = perturb_missing_data(empty_df, 0.10)
    assert perturbed.empty


def test_perturbed_storage(sample_price_df):
    """Test that PerturbedStorage intercepts read_ohlcv and applies perturbations."""
    base_storage = MagicMock()
    base_storage.read_ohlcv.return_value = MarketDataset(
        data=sample_price_df,
        start_date=date(2023, 1, 1),
        end_date=date(2023, 1, 20),
    )

    # Dummy perturb function that multiplies Close by 2
    def double_close(df):
        res = df.copy()
        res["close"] = res["close"] * 2
        return res

    perturbed_storage = PerturbedStorage(base_storage, double_close)
    result = perturbed_storage.read_ohlcv(["AAPL"], date(2023, 1, 1), date(2023, 1, 20))

    assert (result.data["close"] == sample_price_df["close"] * 2).all()


@patch("alphalab.engine.robustness.NIFTY50Universe")
def test_robustness_evaluator_basic(mock_universe_class, sample_price_df):
    """Test RobustnessEvaluator calculates scores and generates failure reasons."""
    # Mock universe constituents
    mock_universe = MagicMock()
    mock_universe_class.return_value = mock_universe
    mock_universe.get_constituents.return_value = [
        UniverseEntry(
            ticker="AAPL",
            index_name="NIFTY50",
            effective_from=date(2023, 1, 1),
            effective_to=None,
        ),
        UniverseEntry(
            ticker="MSFT",
            index_name="NIFTY50",
            effective_from=date(2023, 1, 1),
            effective_to=None,
        ),
    ]

    base_storage = MagicMock()
    base_storage.get_available_date_range.return_value = (
        date(2023, 1, 1),
        date(2023, 1, 20),
    )
    base_storage.read_ohlcv.return_value = MarketDataset(
        data=sample_price_df,
        start_date=date(2023, 1, 1),
        end_date=date(2023, 1, 20),
    )

    # Use 1 iteration to speed up tests
    evaluator = RobustnessEvaluator(base_storage, num_iterations=1)

    # Simple factor formula string
    formula = "Momentum(2)"

    results = evaluator.run_robustness(formula, baseline_sharpe=1.5)

    assert "noise_score" in results
    assert "missing_data_score" in results
    assert "overall_score" in results
    assert "failure_reasons" in results

    reasons = results["failure_reasons"]
    assert "sensitivity_profile" in reasons
    assert "details" in reasons
    assert "noise_ratio" in reasons
    assert "missing_data_ratio" in reasons


@patch("alphalab.engine.robustness.NIFTY50Universe")
def test_robustness_evaluator_unprofitable_baseline(
    mock_universe_class, sample_price_df
):
    """Test RobustnessEvaluator handles non-profitable baseline Sharpe ratio gracefully."""
    mock_universe = MagicMock()
    mock_universe_class.return_value = mock_universe
    mock_universe.get_constituents.return_value = [
        UniverseEntry(
            ticker="AAPL",
            index_name="NIFTY50",
            effective_from=date(2023, 1, 1),
            effective_to=None,
        ),
    ]

    base_storage = MagicMock()
    base_storage.get_available_date_range.return_value = (
        date(2023, 1, 1),
        date(2023, 1, 20),
    )
    base_storage.read_ohlcv.return_value = MarketDataset(
        data=sample_price_df,
        start_date=date(2023, 1, 1),
        end_date=date(2023, 1, 20),
    )

    evaluator = RobustnessEvaluator(base_storage, num_iterations=1)
    results = evaluator.run_robustness("Momentum(2)", baseline_sharpe=-0.5)

    assert results["noise_score"] == 0.0
    assert results["missing_data_score"] == 0.0
    assert results["overall_score"] == 0.0
    assert results["failure_reasons"]["sensitivity_profile"] == "not_profitable"
