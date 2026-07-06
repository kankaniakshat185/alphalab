"""
scripts/demo_factor_backtest.py
==============================
A simple, self-contained demo script showing the end-to-end AlphaLab pipeline:
1. Downloads real stock price data for Reliance and TCS from Yahoo Finance.
2. Saves the prices to a temporary DuckDB database.
3. Compiles a user-defined factor formula using the DSL compiler.
4. Runs the backtest engine to construct a daily portfolio.
5. Calculates and prints final metrics (Sharpe ratio, Drawdown, etc.) in a clean, readable way.

Run it with:
    .venv/bin/python scripts/demo_factor_backtest.py
"""

import os
import sys
from datetime import date

# Ensure src is in Python path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
)


from alphalab.common.types import UniverseEntry
from alphalab.data.pipeline import IngestionPipeline
from alphalab.data.providers.yahoo_provider import YahooProvider
from alphalab.data.storage.duckdb import DuckDBStorage
from alphalab.data.universe.base import Universe
from alphalab.data.validation.suite import ValidatorSuite
from alphalab.dsl import compile_factor
from alphalab.engine.evaluator import FactorEvaluator
from alphalab.engine.metrics import PerformanceCalculator
from alphalab.engine.portfolio import PortfolioConstructor


class SimpleTwoStockUniverse(Universe):
    """A dummy universe containing just Reliance and TCS."""

    def get_constituents(self, as_of_date: date) -> list[UniverseEntry]:
        return [
            UniverseEntry("RELIANCE.NS", "NIFTY50", date(2000, 1, 1), None),
            UniverseEntry("TCS.NS", "NIFTY50", date(2000, 1, 1), None),
        ]


def run_demo():
    print("=" * 80)
    print("ALPHALAB END-TO-END FACTOR BACKTEST DEMO")
    print("=" * 80)

    # 1. Setup temporary DuckDB database
    temp_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "internal", "demo_temp")
    )
    os.makedirs(temp_dir, exist_ok=True)
    db_path = os.path.join(temp_dir, "demo.duckdb")
    print(f"[Step 1] Initializing temporary DuckDB storage at:\n  {db_path}")

    # Configure yfinance timezone cache location to write inside our workspace
    import yfinance as yf

    yf.set_tz_cache_location(os.path.join(temp_dir, "yf_cache"))

    storage = DuckDBStorage(db_path=db_path)
    storage.initialize_schema()

    # 2. Ingest real stock price data
    print("\n[Step 2] Downloading historical market data from Yahoo Finance...")
    universe = SimpleTwoStockUniverse()
    provider = YahooProvider()
    validators = ValidatorSuite(
        validators=[]
    )  # Skip strict validation to ensure demo runs
    pipeline = IngestionPipeline(universe, provider, storage, validators)

    start_date = date(2023, 1, 1)
    end_date = date(2023, 12, 31)
    print(
        f"  Downloading prices for RELIANCE.NS and TCS.NS from {start_date} to {end_date}..."
    )
    pipeline.run(start_date, end_date)

    # 3. Define and compile a factor formula using the DSL
    formula = "Momentum(5)"
    print(
        f"\n[Step 3] Compiling factor formula string using AlphaLab DSL:\n  Formula: {formula!r}"
    )
    factor_func = compile_factor(formula)
    print("  => Successfully compiled into an executable Python function.")

    # 4. Evaluate signals
    print("\n[Step 4] Evaluating factor signals across the stock price data...")
    evaluator = FactorEvaluator(storage)
    signals_df = evaluator.evaluate(
        factor_func, ["RELIANCE.NS", "TCS.NS"], start_date, end_date
    )
    print(f"  Generated {len(signals_df)} daily signal records. Sample output:")
    print(signals_df.head(6).to_string(index=False))

    # 5. Construct target portfolio weights
    print(
        "\n[Step 5] Translating signals into balanced portfolio weights (Z-Score normalization)..."
    )
    weights_df = PortfolioConstructor.signals_to_weights(signals_df)
    print("  Sample weights (showing daily dollar-neutral long/short allocations):")
    print(weights_df.head(6).to_string(index=False))

    # 6. Run performance calculator
    print(
        "\n[Step 6] Simulating portfolio returns and calculating performance metrics..."
    )
    prices_df = storage.read_ohlcv(["RELIANCE.NS", "TCS.NS"], start_date, end_date).data
    portfolio_returns = PerformanceCalculator.compute_returns(weights_df, prices_df)
    metrics = PerformanceCalculator.calculate_metrics(
        portfolio_returns, signals_df, prices_df
    )

    print("\n" + "=" * 80)
    print("FINAL STRATEGY BACKTEST RESULTS (2023)")
    print("=" * 80)
    print(f"  Sharpe Ratio (annualized) : {metrics.get('sharpe', 0.0):.4f}")
    print(
        f"  Max Drawdown (percentage) : {metrics.get('max_drawdown', 0.0) * 100:.2f}%"
    )
    print(
        f"  Information Coefficient   : {metrics.get('ic', 0.0):.4f} (predictive power)"
    )
    print("=" * 80)

    # Cleanup database file
    try:
        os.remove(db_path)
        os.rmdir(temp_dir)
    except OSError:
        pass


if __name__ == "__main__":
    run_demo()
