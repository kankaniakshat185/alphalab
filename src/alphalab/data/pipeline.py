"""
alphalab.data.pipeline
======================
Orchestrates the market data ingestion, transformation, validation, and database load.
"""

import logging
from datetime import date

from alphalab.common.exceptions import DataError
from alphalab.common.types import MarketDataset
from alphalab.data.providers.provider import MarketDataProvider
from alphalab.data.storage.base import Storage
from alphalab.data.transformer import DataTransformer
from alphalab.data.universe.base import Universe
from alphalab.data.validation.suite import ValidatorSuite

logger = logging.getLogger("alphalab.data.pipeline")


class IngestionPipeline:
    """Orchestrator pipeline executing the end-to-end data loading process."""

    def __init__(
        self,
        universe: Universe,
        provider: MarketDataProvider,
        storage: Storage,
        validators: ValidatorSuite,
    ) -> None:
        """Initialize the IngestionPipeline.

        Args:
            universe: Resolver for index constituent membership.
            provider: Market data download client.
            storage: Storage layer database client.
            validators: Orchestrator containing validation modules.
        """
        self.universe = universe
        self.provider = provider
        self.storage = storage
        self.validators = validators
        self.transformer = DataTransformer()

    def run(self, start_date: date, end_date: date) -> None:
        """Execute the end-to-end market data ingestion.

        Args:
            start_date: Start ingestion range.
            end_date: End ingestion range.
        """
        logger.info(
            f"[DataIngestion] [Pipeline] Starting ingestion run from {start_date} to {end_date}"
        )

        # 1. Initialize DB tables
        self.storage.initialize_schema()

        # 2. Resolve Point-in-time Constituents over the date range
        # We query the constituents active at the end_date of the run
        universe_entries = self.universe.get_constituents(end_date)
        if not universe_entries:
            logger.warning(
                f"[DataIngestion] [Pipeline] Resolved empty universe constituents list on date {end_date}."
            )
            return

        tickers = [e.ticker for e in universe_entries]
        logger.info(
            f"[DataIngestion] [Pipeline] Resolved {len(tickers)} active constituents: {tickers}"
        )

        # 3. Fetch Raw Market Data in bulk
        try:
            raw_df = self.provider.fetch_ohlcv(tickers, start_date, end_date)
        except Exception as e:
            msg = f"Failed to fetch market prices from provider: {e}"
            logger.error(f"[DataIngestion] [Pipeline] {msg}")
            raise DataError(msg) from e

        # 4. Standardize columns & convert to MarketDataset
        dataset = self.transformer.transform(raw_df, start_date, end_date)

        # 5. Run Validation Suite checks
        report = self.validators.validate(dataset)

        # 6. Log diagnostics and apply filtering rules
        # Log Warnings
        for issue in report.warnings:
            logger.warning(
                f"[DataIngestion] [{issue.issue_type}] [WARNING] Ticker {issue.ticker}: {issue.description}"
            )

        # Log and Process Errors
        error_tickers = set()
        for issue in report.errors:
            logger.error(
                f"[DataIngestion] [{issue.issue_type}] [ERROR] Ticker {issue.ticker}: {issue.description}"
            )
            error_tickers.add(issue.ticker)

        # Filter out entire tickers that contain severe errors to preserve dataset integrity
        clean_df = dataset.data
        if error_tickers:
            logger.info(
                f"[DataIngestion] [Pipeline] Filtering out {len(error_tickers)} tickers due to schema/validation errors: {error_tickers}"
            )
            clean_df = clean_df[~clean_df["ticker"].isin(error_tickers)].copy()

        clean_dataset = MarketDataset(
            data=clean_df, start_date=start_date, end_date=end_date
        )

        # Filter universe entries to match clean tickers
        clean_universe_entries = [
            e for e in universe_entries if e.ticker not in error_tickers
        ]

        # 7. Write clean dataset and universe entries into DuckDB storage
        if not clean_dataset.data.empty:
            self.storage.write_ohlcv(clean_dataset)
            self.storage.write_universe(clean_universe_entries)
            logger.info(
                f"[DataIngestion] [Pipeline] Ingested {len(clean_dataset.data)} clean records successfully."
            )
        else:
            logger.warning(
                "[DataIngestion] [Pipeline] Ingestion completed with 0 stored records (all data dropped due to errors)."
            )
