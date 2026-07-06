"""
alphalab.engine.evaluator
=========================
Evaluates compiled Factor DSL functions over historical data.
"""

from collections.abc import Callable
from datetime import date

import pandas as pd

from alphalab.common.exceptions import DataError
from alphalab.data.storage.base import Storage


class FactorEvaluator:
    """Evaluates compiled factor functions across a universe of tickers."""

    def __init__(self, storage: Storage):
        self.storage = storage

    def evaluate(
        self,
        factor_func: Callable[[pd.DataFrame], pd.Series],
        tickers: list[str],
        start_date: date,
        end_date: date,
    ) -> pd.DataFrame:
        """
        Evaluate the factor function across historical data for the given tickers.

        Args:
            factor_func: Compiled Pandas callable from the DSL compiler.
            tickers: List of target tickers to evaluate.
            start_date: Historical start date.
            end_date: Historical end date.

        Returns:
            DataFrame containing raw alpha signals with columns ['date', 'ticker', 'signal'].
        """
        # Fetch OHLCV data from storage
        dataset = self.storage.read_ohlcv(tickers, start_date, end_date)
        df = dataset.data

        if df.empty:
            raise DataError(f"No OHLCV data found between {start_date} and {end_date}")

        # Map standard storage columns to DSL expected identifiers (Capitalized)
        df = df.rename(columns={
            "adj_close": "Price",
            "volume": "Volume",
            "open": "Open",
            "high": "High",
            "low": "Low"
        })

        # Sort by date for chronological rolling window evaluation
        df = df.sort_values(by=["ticker", "date"]).reset_index(drop=True)

        # Apply factor function per ticker safely to avoid data leakage
        def apply_factor(group: pd.DataFrame) -> pd.DataFrame:
            signal = factor_func(group)
            return pd.DataFrame({
                "date": group["date"],
                "ticker": group.name,
                "signal": signal.values
            })

        # include_groups=False silences Pandas 2.2+ FutureWarnings
        result_df = df.groupby("ticker", group_keys=False).apply(apply_factor, include_groups=False)

        # Drop rows where signal is NaN (e.g. from rolling windows/lags)
        result_df = result_df.dropna(subset=["signal"]).reset_index(drop=True)

        return result_df
