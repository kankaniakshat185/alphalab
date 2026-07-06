import os
import sys
from datetime import date

import pandas as pd

# Ensure the src dir is in the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from alphalab.common.types import MarketDataset, UniverseEntry
from alphalab.data.pipeline import IngestionPipeline
from alphalab.data.providers.yahoo_provider import YahooProvider
from alphalab.data.storage.duckdb import DuckDBStorage
from alphalab.data.universe.nifty50 import NIFTY50Universe
from alphalab.data.validation.calendar import CalendarValidator
from alphalab.data.validation.corporate_actions import CorporateActionsValidator
from alphalab.data.validation.quality import QualityValidator
from alphalab.data.validation.schema import SchemaValidator
from alphalab.data.validation.suite import ValidatorSuite


def run_scenario_a():
    print("="*80)
    print("SCENARIO A: Normal Ingestion Flow (Sanity Check) [In-Memory]")
    print("="*80)

    import tempfile
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test.duckdb")
    storage = DuckDBStorage(db_path=db_path)
    storage.initialize_schema()
    universe = NIFTY50Universe()

    original_get = universe.get_constituents
    universe.get_constituents = lambda d: [
        UniverseEntry("RELIANCE.NS", "NIFTY50", date(2000, 1, 1), None),
        UniverseEntry("TCS.NS", "NIFTY50", date(2000, 1, 1), None)
    ]

    provider = YahooProvider()
    validators = ValidatorSuite(
        validators=[
            SchemaValidator(),
            QualityValidator(),
            CalendarValidator(),
            CorporateActionsValidator(),
        ]
    )

    pipeline = IngestionPipeline(universe, provider, storage, validators)

    # First week of Jan 2023
    start_d = date(2023, 1, 2)
    end_d = date(2023, 1, 6)

    print(f"Fetching data for RELIANCE.NS and TCS.NS from {start_d} to {end_d}...")
    pipeline.run(start_d, end_d)

    print("\nQuerying back from DuckDB Storage:")
    df = storage.read_ohlcv(["RELIANCE.NS", "TCS.NS"], start_d, end_d).data
    print(df.to_string())

    # Assert row counts
    assert len(df) == 10, f"Expected 10 rows (5 days * 2 tickers), got {len(df)}"
    print("\n[SUCCESS] Pipeline successfully ran and validated data without errors.")

    # Restore mock
    universe.get_constituents = original_get


def run_scenario_b():
    print("\n" + "="*80)
    print("SCENARIO B: Triggering Validation Suite (Malicious Data)")
    print("="*80)

    # Craft malicious DataFrame: missing a day, massive jump
    dates = pd.date_range(start="2023-01-02", periods=4, freq="B")
    dates = dates.drop(dates[1])  # Drop Tuesday

    data = {
        "ticker": ["HDFCBANK.NS", "HDFCBANK.NS", "HDFCBANK.NS"],
        "date": dates,
        "open": [100.0, 105.0, 1500.0],
        "high": [102.0, 107.0, 1550.0],
        "low": [98.0, 101.0, 1490.0],
        "close": [101.0, 106.0, 1520.0],
        "volume": [1000, 1100, 5000],
        "adj_close": [101.0, 106.0, 1520.0],
    }
    df = pd.DataFrame(data)
    dataset = MarketDataset(data=df, start_date=dates.min().date(), end_date=dates.max().date())

    validators = ValidatorSuite(
        validators=[
            SchemaValidator(),
            QualityValidator(jump_threshold=0.5), # max 50% jump
            CalendarValidator(),
        ]
    )

    print("Feeding malicious data into ValidatorSuite:")
    print(df.to_string())
    print("\nRunning validations...")
    report = validators.validate(dataset)

    print("\nValidation Report Output:")
    print(f"Has Errors: {report.has_errors}")
    for warning in report.warnings:
        print(f"[WARNING] {warning}")
    for error in report.errors:
        print(f"[ERROR] {error}")

    assert not report.has_errors, "Validation should NOT have failed completely (only warnings)!"
    assert len(report.warnings) > 0, "Expected quality validation warnings!"
    print("\n[SUCCESS] Guardrails worked exactly as expected!")


def run_scenario_c():
    print("\n" + "="*80)
    print("SCENARIO C: Universe Point-in-Time Resolution (2018 vs 2023)")
    print("="*80)

    universe = NIFTY50Universe()

    date_2018 = date(2018, 1, 1)
    date_2023 = date(2023, 1, 1)

    constituents_2018 = set(universe.get_constituents(date_2018))
    constituents_2023 = set(universe.get_constituents(date_2023))

    added = constituents_2023 - constituents_2018
    removed = constituents_2018 - constituents_2023

    print("Stocks ADDED to NIFTY 50 between 2018 and 2023:")
    for t in sorted(added, key=lambda x: x.ticker):
        print(f"  + {t.ticker}")

    print("\nStocks REMOVED from NIFTY 50 between 2018 and 2023:")
    for t in sorted(removed, key=lambda x: x.ticker):
        print(f"  - {t.ticker}")

    assert len(added) > 0, "Expected universe churn based on point-in-time resolution!"
    print("\n[SUCCESS] Point-in-time index resolution is functioning correctly.")


if __name__ == "__main__":
    run_scenario_a()
    run_scenario_b()
    run_scenario_c()
