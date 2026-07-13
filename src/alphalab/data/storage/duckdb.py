"""
alphalab.data.storage.duckdb
============================
DuckDB concrete implementation of the Storage interface.
"""

import logging
import os
from datetime import date

import duckdb
import pandas as pd

from alphalab.common.types import MarketDataset, UniverseEntry
from alphalab.config.settings import settings
from alphalab.data.storage.base import Storage
from alphalab.data.storage.schema import SchemaManager

logger = logging.getLogger("alphalab.data.storage.duckdb")


class DuckDBStorage(Storage):
    """Storage engine implementation using DuckDB as the backing file-based database."""

    def __init__(self, db_path: str = settings.DUCKDB_PATH) -> None:
        """Initialize the storage driver.

        Args:
            db_path: Path to the DuckDB database file.
        """
        self.db_path = db_path
        self._schema_manager = SchemaManager()

    def _get_connection(self, read_only: bool = False) -> duckdb.DuckDBPyConnection:
        """Create and return a new DuckDB connection, setting operational pragmas."""
        # Ensure database directory exists
        db_dir = os.path.dirname(self.db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

        conn = duckdb.connect(self.db_path, read_only=read_only)
        conn.execute(f"PRAGMA memory_limit='{settings.DUCKDB_MEMORY_LIMIT}'")
        return conn

    def initialize_schema(self) -> None:
        """Initialize the database schema using the SchemaManager."""
        conn = self._get_connection()
        try:
            self._schema_manager.initialize_schema(conn)
        finally:
            conn.close()

    def write_ohlcv(self, dataset: MarketDataset) -> None:
        """Bulk insert or replace price records using vectorized DataFrames.

        Args:
            dataset: The MarketDataset containing standard OHLCV prices.
        """
        if dataset.data.empty:
            logger.warning(
                "[DataIngestion] [DuckDBStorage] Received empty MarketDataset to write"
            )
            return

        logger.info(
            f"[DataIngestion] [DuckDBStorage] Writing {len(dataset.data)} price records to DuckDB"
        )
        conn = self._get_connection()
        try:
            # Register pandas DataFrame as a temporary view to query it directly in SQL
            df = dataset.data  # noqa: F841
            conn.execute(
                """
                INSERT OR REPLACE INTO ohlcv
                SELECT ticker, CAST(date AS DATE) as date, open, high, low, close, volume, adj_close
                FROM df
                """
            )
            logger.debug("[DataIngestion] [DuckDBStorage] Bulk write ohlcv complete")
        finally:
            conn.close()

    def read_ohlcv(
        self, tickers: list[str], start_date: date, end_date: date
    ) -> MarketDataset:
        """Read standard price rows from DuckDB and wrap them in a MarketDataset.

        Args:
            tickers: List of stock tickers.
            start_date: Start filter date.
            end_date: End filter date.

        Returns:
            MarketDataset object wrapping the loaded records.
        """
        if not tickers:
            logger.warning(
                "[DataIngestion] [DuckDBStorage] Empty ticker query requested"
            )
            empty_df = pd.DataFrame(
                columns=[
                    "ticker",
                    "date",
                    "open",
                    "high",
                    "low",
                    "close",
                    "volume",
                    "adj_close",
                ]
            )
            return MarketDataset(
                data=empty_df, start_date=start_date, end_date=end_date
            )

        logger.info(
            f"[DataIngestion] [DuckDBStorage] Querying ohlcv data for {len(tickers)} tickers "
            f"from {start_date} to {end_date}"
        )
        conn = self._get_connection(read_only=True)
        try:
            placeholders = ", ".join(["?"] * len(tickers))
            query = f"""
                SELECT ticker, date, open, high, low, close, volume, adj_close
                FROM ohlcv
                WHERE ticker IN ({placeholders})
                  AND date >= ?
                  AND date <= ?
                ORDER BY ticker, date
            """
            params = [*tickers, start_date, end_date]
            # Use fetchdf() because it is highly optimized via Arrow and prevents OOM on Linux.
            df = conn.execute(query, params).fetchdf()

            logger.debug(
                f"[DataIngestion] [DuckDBStorage] Query returned {len(df)} price records"
            )
            return MarketDataset(data=df, start_date=start_date, end_date=end_date)
        finally:
            conn.close()

    def get_available_date_range(self) -> tuple[date, date]:
        """Get the minimum and maximum dates available in the OHLCV storage."""
        conn = self._get_connection(read_only=True)
        try:
            res = conn.execute("SELECT MIN(date), MAX(date) FROM ohlcv").fetchone()
            if not res or res[0] is None or res[1] is None:
                raise ValueError("No historical prices found in storage table 'ohlcv'")
            # The returned types are datetime.date
            return res[0], res[1]
        finally:
            conn.close()

    def write_universe(self, entries: list[UniverseEntry]) -> None:
        """Write index constituent history entries into storage.

        Args:
            entries: List of UniverseEntry domain objects.
        """
        if not entries:
            logger.warning(
                "[DataIngestion] [DuckDBStorage] No universe entries provided to write"
            )
            return

        logger.info(
            f"[DataIngestion] [DuckDBStorage] Writing {len(entries)} universe entries to DuckDB"
        )

        # Convert dataclass list to a pandas DataFrame
        df = pd.DataFrame(  # noqa: F841
            [
                {
                    "ticker": e.ticker,
                    "index_name": e.index_name,
                    "effective_from": e.effective_from,
                    "effective_to": e.effective_to,
                }
                for e in entries
            ]
        )

        conn = self._get_connection()
        try:
            conn.execute(
                """
                INSERT OR REPLACE INTO universe
                SELECT ticker, index_name, CAST(effective_from AS DATE), CAST(effective_to AS DATE)
                FROM df
                """
            )
            logger.debug("[DataIngestion] [DuckDBStorage] Bulk write universe complete")
        finally:
            conn.close()

    def read_universe(
        self, index_name: str, start_date: date, end_date: date
    ) -> list[UniverseEntry]:
        """Read historical constituent intervals active during the target window.

        Args:
            index_name: Name of the index (e.g., NIFTY50).
            start_date: Start of historical lookup window.
            end_date: End of historical lookup window.

        Returns:
            List of active UniverseEntry constituent intervals.
        """
        logger.info(
            f"[DataIngestion] [DuckDBStorage] Reading index {index_name} active constituents "
            f"between {start_date} and {end_date}"
        )
        conn = self._get_connection(read_only=True)
        try:
            # Query active constituents where interval overlaps [start_date, end_date]
            query = """
                SELECT ticker, index_name, effective_from, effective_to
                FROM universe
                WHERE index_name = ?
                  AND effective_from <= ?
                  AND (effective_to IS NULL OR effective_to >= ?)
                ORDER BY ticker, effective_from
            """
            params = [index_name, end_date, start_date]
            # Use fetchall() instead of fetchdf() to avoid segfault on
            # Python 3.13 + DuckDB 1.5 + Apple Silicon (ARM64).
            rows = conn.execute(query, params).fetchall()

            if not rows:
                return []

            entries = [
                UniverseEntry(
                    ticker=row[0],
                    index_name=row[1],
                    effective_from=row[2],
                    effective_to=row[3] if row[3] is not None else None,
                )
                for row in rows
            ]
            logger.debug(
                f"[DataIngestion] [DuckDBStorage] Query returned {len(entries)} constituent entries"
            )
            return entries
        finally:
            conn.close()
