"""
alphalab.engine.runner
======================
Service layer for orchestrating experiments and evaluating factors.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from alphalab.api.models.factor import Factor
from alphalab.api.models.results import BacktestResult
from alphalab.common.exceptions import DataError
from alphalab.data.storage.duckdb import DuckDBStorage
from alphalab.data.universe.nifty50 import NIFTY50Universe
from alphalab.dsl import compile_factor
from alphalab.engine.evaluator import FactorEvaluator
from alphalab.engine.metrics import PerformanceCalculator
from alphalab.engine.portfolio import PortfolioConstructor


class ExperimentRunner:
    """Service layer for running backtests and robustness checks."""

    @staticmethod
    async def run_backtest(factor: Factor, session: AsyncSession) -> None:
        """Execute a backtest for a single factor and persist results."""
        # 1. Compile the formula string
        factor_func = compile_factor(factor.formula)

        # 2. Get date ranges from storage dynamically
        storage = DuckDBStorage()
        start_date, end_date = storage.get_available_date_range()

        # 3. Resolve universe constituents active at the end_date
        universe = NIFTY50Universe()
        constituents = universe.get_constituents(end_date)
        tickers = [c.ticker for c in constituents]
        if not tickers:
            raise DataError(f"No constituents found active on date {end_date}")

        # 4. Evaluate factor to generate daily raw signal series
        evaluator = FactorEvaluator(storage)
        signals_df = evaluator.evaluate(factor_func, tickers, start_date, end_date)

        # 5. Translate raw signals into portfolio target weights
        weights_df = PortfolioConstructor.signals_to_weights(signals_df)

        # 6. Read raw database price history to compute returns
        prices_dataset = storage.read_ohlcv(tickers, start_date, end_date)
        prices_df = prices_dataset.data

        # Calculate returns & performance metrics
        portfolio_returns = PerformanceCalculator.compute_returns(
            weights_df, prices_df
        )
        metrics = PerformanceCalculator.calculate_metrics(
            portfolio_returns, signals_df, prices_df
        )

        # Compute equity curve for the API
        if portfolio_returns.empty:
            equity_curve = []
        else:
            cumulative_returns = (1 + portfolio_returns).cumprod()
            equity_curve = [
                {
                    "date": dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt),
                    "cumulative_return": float(val),
                }
                for dt, val in cumulative_returns.items()
            ]

        # Check if backtest result already exists to avoid unique constraint violations
        stmt = select(BacktestResult).where(BacktestResult.factor_id == factor.id)
        db_res = await session.execute(stmt)
        b_res = db_res.scalar_one_or_none()

        if not b_res:
            b_res = BacktestResult(
                factor_id=factor.id,
                sharpe=metrics.get("sharpe"),
                sortino=None,
                calmar=None,
                max_drawdown=metrics.get("max_drawdown"),
                turnover=None,
                ic=metrics.get("ic"),
                rank_ic=None,
                equity_curve=equity_curve,
            )
            session.add(b_res)
        else:
            b_res.sharpe = metrics.get("sharpe")
            b_res.max_drawdown = metrics.get("max_drawdown")
            b_res.ic = metrics.get("ic")
            b_res.equity_curve = equity_curve

        await session.flush()
