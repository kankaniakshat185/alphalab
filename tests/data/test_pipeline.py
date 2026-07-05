"""
tests/data/test_pipeline.py
===========================
Integration tests for IngestionPipeline using mock providers and temporary Storage.
"""

import os
from datetime import date

import pandas as pd
import pytest

from alphalab.common.types import UniverseEntry
from alphalab.data.pipeline import IngestionPipeline
from alphalab.data.providers.provider import MarketDataProvider
from alphalab.data.storage.duckdb import DuckDBStorage
from alphalab.data.universe.base import Universe
from alphalab.data.validation.calendar import CalendarValidator
from alphalab.data.validation.corporate_actions import CorporateActionsValidator
from alphalab.data.validation.quality import QualityValidator
from alphalab.data.validation.schema import SchemaValidator
from alphalab.data.validation.suite import ValidatorSuite


class MockUniverse(Universe):
    def get_constituents(self, as_of_date: date):
        return [
            UniverseEntry("RELIANCE.NS", "NIFTY50", date(2020, 1, 1)),
            UniverseEntry("TCS.NS", "NIFTY50", date(2020, 1, 1)),
            UniverseEntry("BAD.NS", "NIFTY50", date(2020, 1, 1)),  # Will contain errors
        ]


class MockProvider(MarketDataProvider):
    def fetch_ohlcv(self, tickers: list, start_date: date, end_date: date):
        # Read from shared test fixtures
        fixture_path = os.path.join(
            os.path.dirname(__file__), "../fixtures/market_fixtures.csv"
        )
        df = pd.read_csv(fixture_path)

        # Append a bad record for BAD.NS with negative prices to trigger validator error filtering
        bad_records = pd.DataFrame(
            {
                "ticker": ["BAD.NS", "BAD.NS"],
                "date": ["2026-01-01", "2026-01-02"],
                "open": [-100.0, 50.0],  # Negative triggers SchemaValidator error
                "high": [200.0, 60.0],
                "low": [90.0, 45.0],
                "close": [100.0, 50.0],
                "volume": [1000, 2000],
                "adj_close": [100.0, 50.0],
            }
        )
        return pd.concat([df, bad_records]).reset_index(drop=True)


@pytest.mark.integration
def test_pipeline_ingestion_flow(tmp_path) -> None:
    """End-to-end integration test verifying transformation, validation, and storage write."""
    db_file = str(tmp_path / "test_alphalab.db")

    # Instantiate abstractions
    universe = MockUniverse()
    provider = MockProvider()
    storage = DuckDBStorage(db_path=db_file)

    # Initialize validator suite
    suite = ValidatorSuite(
        validators=[
            SchemaValidator(),
            QualityValidator(),
            CalendarValidator(),
            CorporateActionsValidator(),
        ]
    )

    # Run Ingestion Pipeline
    pipeline = IngestionPipeline(
        universe=universe, provider=provider, storage=storage, validators=suite
    )

    start = date(2026, 1, 1)
    end = date(2026, 1, 7)

    # Run the pipeline
    pipeline.run(start, end)

    # Retrieve stored price dataset from Storage
    stored_dataset = storage.read_ohlcv(["RELIANCE.NS", "TCS.NS", "BAD.NS"], start, end)
    df = stored_dataset.data

    assert not df.empty
    # BAD.NS should be completely dropped from the dataset due to error
    assert "BAD.NS" not in df["ticker"].unique()
    assert "RELIANCE.NS" in df["ticker"].unique()
    assert "TCS.NS" in df["ticker"].unique()

    # Verify that clean constituents were written to universe table
    stored_universe = storage.read_universe("NIFTY50", start, end)
    stored_tickers = {e.ticker for e in stored_universe}

    assert "RELIANCE.NS" in stored_tickers
    assert "TCS.NS" in stored_tickers
    assert "BAD.NS" not in stored_tickers
