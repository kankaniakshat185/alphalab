"""
alphalab.engine.metrics
=======================
Calculates core portfolio performance metrics.
"""

import numpy as np
import pandas as pd


class PerformanceCalculator:
    """Calculates performance and risk metrics for backtest results."""

    @staticmethod
    def compute_returns(weights_df: pd.DataFrame, prices_df: pd.DataFrame) -> pd.Series:
        """
        Compute daily portfolio returns based on target weights and forward asset returns.

        Args:
            weights_df: DataFrame with ['date', 'ticker', 'weight']
            prices_df: OHLCV DataFrame containing ['date', 'ticker', 'close'/'adj_close']

        Returns:
            Series of daily portfolio returns indexed by date.
        """
        if weights_df.empty or prices_df.empty:
            return pd.Series(dtype=float)

        price_col = "adj_close" if "adj_close" in prices_df.columns else "close"

        # Sort by date to compute forward returns
        prices = prices_df.sort_values(by=["ticker", "date"]).copy()
        prices["fwd_return"] = prices.groupby("ticker")[price_col].pct_change().shift(-1)

        # Merge weights with forward returns
        merged = pd.merge(
            weights_df,
            prices[["date", "ticker", "fwd_return"]],
            on=["date", "ticker"],
            how="inner"
        )

        # Portfolio return today is sum of (weight * fwd_return)
        merged["port_return"] = merged["weight"] * merged["fwd_return"]

        daily_returns = merged.groupby("date")["port_return"].sum()
        return daily_returns

    @staticmethod
    def calculate_metrics(
        portfolio_returns: pd.Series, signals_df: pd.DataFrame, prices_df: pd.DataFrame
    ) -> dict[str, float]:
        """
        Calculate key performance indicators.

        Args:
            portfolio_returns: Daily portfolio returns.
            signals_df: Raw alpha signals ['date', 'ticker', 'signal'].
            prices_df: OHLCV DataFrame.

        Returns:
            Dictionary of metrics (sharpe, max_drawdown, ic).
        """
        metrics = {}

        # 1. Sharpe Ratio (Annualized)
        if len(portfolio_returns) < 2 or portfolio_returns.std() == 0:
            metrics["sharpe"] = 0.0
        else:
            annualized_mean = portfolio_returns.mean() * 252
            annualized_std = portfolio_returns.std() * np.sqrt(252)
            metrics["sharpe"] = annualized_mean / annualized_std

        # 2. Max Drawdown
        if len(portfolio_returns) == 0:
            metrics["max_drawdown"] = 0.0
        else:
            cum_returns = (1 + portfolio_returns).cumprod()
            peak = cum_returns.cummax()
            # Avoid division by zero
            drawdown = (cum_returns - peak) / peak.replace(0, np.nan)
            metrics["max_drawdown"] = abs(drawdown.min()) if not pd.isna(drawdown.min()) else 0.0

        # 3. Information Coefficient (IC)
        if signals_df.empty or prices_df.empty:
            metrics["ic"] = 0.0
            return metrics

        price_col = "adj_close" if "adj_close" in prices_df.columns else "close"
        prices = prices_df.sort_values(by=["ticker", "date"]).copy()
        prices["fwd_return"] = prices.groupby("ticker")[price_col].pct_change().shift(-1)

        merged = pd.merge(
            signals_df,
            prices[["date", "ticker", "fwd_return"]],
            on=["date", "ticker"],
            how="inner"
        )
        merged = merged.dropna(subset=["signal", "fwd_return"])

        if merged.empty:
            metrics["ic"] = 0.0
        else:
            def daily_ic(group: pd.DataFrame) -> float:
                if len(group) < 2:
                    return 0.0
                # Spearman rank correlation
                return float(group["signal"].corr(group["fwd_return"], method="spearman"))

            daily_ics = merged.groupby("date").apply(daily_ic)
            # Filter out NaNs if correlation failed
            daily_ics = daily_ics.dropna()
            metrics["ic"] = daily_ics.mean() if not daily_ics.empty else 0.0

        return metrics
