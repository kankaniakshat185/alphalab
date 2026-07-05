"""
alphalab.common.types
======================
Standard domain type declarations using standard library dataclasses.
"""

from dataclasses import dataclass
from datetime import date

import pandas as pd


@dataclass(frozen=True)
class UniverseEntry:
    """Represents a ticker's membership in an index over a specific date range."""

    ticker: str
    index_name: str
    effective_from: date
    effective_to: date | None = None


@dataclass(frozen=True)
class MarketDataset:
    """Domain wrapper enclosing standardized price history dataframes with validation bounds."""

    data: (
        pd.DataFrame
    )  # Columns: ticker, date, open, high, low, close, volume, adj_close
    start_date: date
    end_date: date

    def __post_init__(self) -> None:
        """Validate dataframe schema formatting requirements."""
        required_cols = {
            "ticker",
            "date",
            "open",
            "high",
            "low",
            "close",
            "volume",
            "adj_close",
        }
        missing = required_cols - set(self.data.columns)
        if missing:
            raise ValueError(f"MarketDataset is missing required columns: {missing}")
