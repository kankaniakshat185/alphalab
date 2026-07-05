"""
tests/data/test_transformer.py
==============================
Tests column mapping, types formatting, and standard layout conversions.
"""

from datetime import date

import pandas as pd
import pytest

from alphalab.common.types import MarketDataset
from alphalab.data.transformer import DataTransformer


@pytest.mark.unit
def test_transformer_clean_mapping() -> None:
    """Transformer should map yfinance columns to clean lowercase columns."""
    transformer = DataTransformer()

    # Raw multiindex-like df or simple dict representation of raw yfinance columns
    raw_data = {
        "ticker": ["TCS.NS", "TCS.NS"],
        "Date": ["2026-01-01", "2026-01-02"],
        "Open": [3800.0, 3810.0],
        "High": [3830.0, 3850.0],
        "Low": [3780.0, 3800.0],
        "Close": [3810.0, 3840.0],
        "Volume": [80000, 95000],
        "Adj Close": [3810.0, 3840.0],
    }
    raw_df = pd.DataFrame(raw_data)

    start = date(2026, 1, 1)
    end = date(2026, 1, 2)

    dataset = transformer.transform(raw_df, start, end)

    assert isinstance(dataset, MarketDataset)
    assert dataset.start_date == start
    assert dataset.end_date == end

    df = dataset.data
    assert list(df.columns) == [
        "ticker",
        "date",
        "open",
        "high",
        "low",
        "close",
        "volume",
        "adj_close",
    ]

    # Verify datatypes
    assert isinstance(df["date"].iloc[0], date)
    assert df["open"].dtype == "float64"
    assert df["volume"].dtype == "int64"
    assert (df["ticker"] == "TCS.NS").all()
