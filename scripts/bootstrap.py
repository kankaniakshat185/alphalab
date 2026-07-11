import os
import sys
from datetime import date

from alembic import command as alembic_command
from alembic.config import Config

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


def bootstrap():
    print("=" * 80)
    print("ALPHALAB SYSTEM BOOTSTRAP & INGESTION")
    print("=" * 80)

    # 1. Run Alembic Migrations for Metadata Database (PostgreSQL)
    print("\n[1/3] Running database schema migrations (PostgreSQL)...")
    try:
        alembic_cfg = Config("alembic.ini")
        alembic_command.upgrade(alembic_cfg, "head")
        print("PostgreSQL migration completed successfully.")
    except Exception as e:
        print(f"Warning: PostgreSQL migration failed (ensure DB is running): {e}")

    # 2. Setup DuckDB Storage Schema
    print("\n[2/3] Initializing DuckDB database schema...")
    storage = DuckDBStorage()
    storage.initialize_schema()
    print("DuckDB database schema initialized.")

    # 3. Ingest Historical Data if Empty
    print("\n[3/3] Checking historical market data...")
    conn = storage._get_connection(read_only=True)
    try:
        count_res = conn.execute("SELECT COUNT(*) FROM ohlcv").fetchone()
        row_count = count_res[0] if count_res else 0
    except Exception:
        row_count = 0
    finally:
        conn.close()

    if row_count > 0:
        print(
            f"Historical data already exists ({row_count} records in ohlcv). Skipping ingestion."
        )
    else:
        print("No historical data found in DuckDB. Starting ingestion pipeline...")
        # Configure yfinance cache
        import yfinance as yf

        cache_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "internal", "yf_cache")
        )
        os.makedirs(cache_dir, exist_ok=True)
        yf.set_tz_cache_location(cache_dir)

        universe = NIFTY50Universe()
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
        start_date = date(2020, 1, 1)
        end_date = date(2025, 12, 31)

        try:
            pipeline.run(start_date, end_date)
            print("[SUCCESS] Data ingestion complete. DuckDB is fully populated!")
        except Exception as e:
            print(f"[ERROR] Data Ingestion failed: {e}")
            sys.exit(1)

    print("\n" + "=" * 80)
    print("ALPHALAB BOOTSTRAP COMPLETED SUCCESSFULLY")
    print("=" * 80)


if __name__ == "__main__":
    bootstrap()
