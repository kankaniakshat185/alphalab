"""Tests for the Performance Calculator."""

from datetime import date

import pandas as pd
import pytest

from alphalab.engine.metrics import PerformanceCalculator


def test_compute_returns():
    """Test daily portfolio return calculation."""
    weights_df = pd.DataFrame(
        {
            "date": [date(2023, 1, 1), date(2023, 1, 1)],
            "ticker": ["A", "B"],
            "weight": [0.5, -0.5],
        }
    )

    prices_df = pd.DataFrame(
        {
            "date": [
                date(2023, 1, 1),
                date(2023, 1, 2),
                date(2023, 1, 1),
                date(2023, 1, 2),
            ],
            "ticker": ["A", "A", "B", "B"],
            "adj_close": [100.0, 110.0, 200.0, 180.0],  # A +10%, B -10%
        }
    )

    returns = PerformanceCalculator.compute_returns(weights_df, prices_df)

    assert len(returns) == 1
    # Return = 0.5 * 0.1 + (-0.5 * -0.1) = 0.05 + 0.05 = 0.10
    assert returns.iloc[0] == pytest.approx(0.10)


def test_calculate_metrics():
    """Test core metric calculations."""
    returns = pd.Series([0.01, -0.02, 0.03, 0.01, -0.01], index=[1, 2, 3, 4, 5])

    signals_df = pd.DataFrame(
        {
            "date": [date(2023, 1, 1), date(2023, 1, 1)],
            "ticker": ["A", "B"],
            "signal": [1.0, 2.0],
        }
    )

    prices_df = pd.DataFrame(
        {
            "date": [
                date(2023, 1, 1),
                date(2023, 1, 2),
                date(2023, 1, 1),
                date(2023, 1, 2),
            ],
            "ticker": ["A", "A", "B", "B"],
            "adj_close": [100.0, 90.0, 200.0, 220.0],  # A goes down, B goes up
        }
    )

    metrics = PerformanceCalculator.calculate_metrics(returns, signals_df, prices_df)

    assert "sharpe" in metrics
    assert "max_drawdown" in metrics
    assert "ic" in metrics

    # Signal for A=1, B=2. Fwd return for A=-0.1, B=0.1
    # Rank of signals: B > A. Rank of returns: B > A.
    # Perfect positive correlation (IC = 1.0)
    assert metrics["ic"] == pytest.approx(1.0)
