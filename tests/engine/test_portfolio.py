"""Tests for the Portfolio Constructor."""

from datetime import date

import pandas as pd

from alphalab.engine.portfolio import PortfolioConstructor


def test_signals_to_weights_basic():
    """Test basic cross-sectional z-scoring."""
    signals_df = pd.DataFrame(
        {
            "date": [date(2023, 1, 1), date(2023, 1, 1), date(2023, 1, 1)],
            "ticker": ["A", "B", "C"],
            "signal": [1.0, 2.0, 3.0],  # mean=2.0, std=1.0
        }
    )

    weights_df = PortfolioConstructor.signals_to_weights(signals_df)

    assert len(weights_df) == 3
    weights = weights_df["weight"].tolist()
    # z-scores: A=-1, B=0, C=1. Abs sum = 2.
    # Weights should be z / 2 = A=-0.5, B=0.0, C=0.5
    assert weights == [-0.5, 0.0, 0.5]


def test_signals_to_weights_single_asset():
    """Test handling of single asset (std=NaN)."""
    signals_df = pd.DataFrame(
        {
            "date": [date(2023, 1, 1)],
            "ticker": ["A"],
            "signal": [1.0],
        }
    )

    weights_df = PortfolioConstructor.signals_to_weights(signals_df)

    assert len(weights_df) == 1
    assert weights_df["weight"].iloc[0] == 0.0


def test_signals_to_weights_identical_signals():
    """Test handling of identical signals (std=0)."""
    signals_df = pd.DataFrame(
        {
            "date": [date(2023, 1, 1), date(2023, 1, 1)],
            "ticker": ["A", "B"],
            "signal": [1.0, 1.0],
        }
    )

    weights_df = PortfolioConstructor.signals_to_weights(signals_df)

    assert len(weights_df) == 2
    assert weights_df["weight"].tolist() == [0.0, 0.0]


def test_signals_to_weights_empty():
    """Test handling of empty dataframe."""
    signals_df = pd.DataFrame(columns=["date", "ticker", "signal"])
    weights_df = PortfolioConstructor.signals_to_weights(signals_df)
    assert weights_df.empty
