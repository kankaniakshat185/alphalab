import os
import sys
from datetime import date

# Ensure src is in Python path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
)

from alphalab.data.pipeline import IngestionPipeline
from alphalab.data.providers.yahoo_provider import YahooProvider
from alphalab.data.storage.duckdb import DuckDBStorage
from alphalab.data.universe.nifty50 import NIFTY50Universe
from alphalab.data.validation.calendar import CalendarValidator
from alphalab.data.validation.corporate_actions import CorporateActionsValidator
from alphalab.data.validation.quality import QualityValidator
from alphalab.data.validation.schema import SchemaValidator
from alphalab.data.validation.suite import ValidatorSuite


def run_ingestion():
    print("=" * 80)
    print("ALPHALAB PRODUCTION DATA INGESTION PIPELINE")
    print("=" * 80)

    # Configure yfinance tz cache location inside internal directory
    import yfinance as yf

    cache_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "internal", "yf_cache")
    )
    os.makedirs(cache_dir, exist_ok=True)
    yf.set_tz_cache_location(cache_dir)

    # Initialize storage (reads settings.DUCKDB_PATH -> data/alphalab.duckdb)
    storage = DuckDBStorage()
    storage.initialize_schema()

    # Initialize components
    universe = NIFTY50Universe()
    provider = YahooProvider()

    # Use standard validators
    validators = ValidatorSuite(
        validators=[
            SchemaValidator(),
            QualityValidator(),
            CalendarValidator(),
            CorporateActionsValidator(),
        ]
    )

    pipeline = IngestionPipeline(universe, provider, storage, validators)

    # Ingest past 5 years of NIFTY 50 historical data for evaluation
    start_date = date(2020, 1, 1)
    end_date = date(2025, 12, 31)

    print(
        f"Ingesting historical data from {start_date} to {end_date} into production DuckDB..."
    )
    try:
        pipeline.run(start_date, end_date)
        print(
            "\n[SUCCESS] Data ingestion complete. Table ohlcv is populated and ready!"
        )
    except Exception as e:
        print(f"\n[ERROR] Ingestion failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    run_ingestion()
