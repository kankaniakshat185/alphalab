"""
alphalab.data.storage.base
==========================
Defines the abstract interface class for data storage persistence.
"""

from abc import ABC, abstractmethod
from datetime import date

from alphalab.common.types import MarketDataset, UniverseEntry


class Storage(ABC):
    """Abstract base class representing a storage engine for market data."""

    @abstractmethod
    def initialize_schema(self) -> None:
        """Initialize database schema tables."""
        pass

    @abstractmethod
    def write_ohlcv(self, dataset: MarketDataset) -> None:
        """Write standard daily price records from a MarketDataset into storage.

        Args:
            dataset: The MarketDataset containing price history to save.
        """
        pass

    @abstractmethod
    def read_ohlcv(
        self, tickers: list[str], start_date: date, end_date: date
    ) -> MarketDataset:
        """Retrieve daily price records from storage and wrap them in a MarketDataset.

        Args:
            tickers: List of stock tickers.
            start_date: Start range filter.
            end_date: End range filter.

        Returns:
            A MarketDataset wrapping the retrieved DataFrame.
        """
        pass

    @abstractmethod
    def get_available_date_range(self) -> tuple[date, date]:
        """Get the minimum and maximum dates available in the OHLCV storage.

        Returns:
            A tuple of (start_date, end_date).
        """
        pass

    @abstractmethod
    def write_universe(self, entries: list[UniverseEntry]) -> None:
        """Write index constituent history entries into storage.

        Args:
            entries: List of UniverseEntry domain objects.
        """
        pass

    @abstractmethod
    def read_universe(
        self, index_name: str, start_date: date, end_date: date
    ) -> list[UniverseEntry]:
        """Read historical constituent intervals for an index.

        Args:
            index_name: Name of the index (e.g., NIFTY50).
            start_date: Start of historical lookup window.
            end_date: End of historical lookup window.

        Returns:
            List of active UniverseEntry constituent intervals.
        """
        pass
