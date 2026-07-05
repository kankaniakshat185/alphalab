"""
alphalab.data.providers.provider
===============================
Defines the abstract interface for market data provider retrieval.
"""

from abc import ABC, abstractmethod
from datetime import date

import pandas as pd


class MarketDataProvider(ABC):
    """Abstract base class representing an external financial data source."""

    @abstractmethod
    def fetch_ohlcv(
        self, tickers: list[str], start_date: date, end_date: date
    ) -> pd.DataFrame:
        """Fetch daily raw historical prices for multiple tickers in bulk.

        Args:
            tickers: List of stock tickers.
            start_date: Start filter date.
            end_date: End filter date.

        Returns:
            A pandas DataFrame containing raw prices (columns may vary by provider).
        """
        pass
