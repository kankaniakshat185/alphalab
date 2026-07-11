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
        formula: str | None = None,
    ) -> pd.DataFrame:
        """
        Evaluate the factor function across historical data for the given tickers.

        Args:
            factor_func: Compiled Pandas callable from the DSL compiler.
            tickers: List of target tickers to evaluate.
            start_date: Historical start date.
            end_date: Historical end date.
            formula: Optional DSL formula string to apply pass-2 cross-sectional processing.

        Returns:
            DataFrame containing raw alpha signals with columns ['date', 'ticker', 'signal'].
        """
        # Fetch OHLCV data from storage
        dataset = self.storage.read_ohlcv(tickers, start_date, end_date)
        df = dataset.data

        if df.empty:
            raise DataError(f"No OHLCV data found between {start_date} and {end_date}")

        # Map adj_close to close, drop raw unadjusted close if present to avoid name conflict
        if "adj_close" in df.columns:
            if "close" in df.columns:
                df = df.drop(columns=["close"])
            df = df.rename(columns={"adj_close": "close"})

        # Sort by date for chronological rolling window evaluation and compute returns
        df = df.sort_values(by=["ticker", "date"]).reset_index(drop=True)
        df["returns"] = df.groupby("ticker")["close"].pct_change()

        # Add capitalized aliases for backward compatibility with older formulas
        df["Price"] = df["close"]
        df["Volume"] = df["volume"]
        df["Open"] = df["open"]
        df["High"] = df["high"]
        df["Low"] = df["low"]

        # Apply factor function per ticker safely to avoid data leakage
        def apply_factor(group: pd.DataFrame) -> pd.DataFrame:
            signal = factor_func(group)
            return pd.DataFrame(
                {"date": group["date"], "ticker": group.name, "signal": signal.values}
            )

        # include_groups=False silences Pandas 2.2+ FutureWarnings
        result_df = df.groupby("ticker", group_keys=False).apply(
            apply_factor, include_groups=False
        )

        # Drop rows where signal is NaN (e.g. from rolling windows/lags)
        result_df = result_df.dropna(subset=["signal"]).reset_index(drop=True)

        # Apply cross-sectional rank pass if specified in the formula
        if formula and "rank(" in formula.lower().replace(" ", ""):
            result_df = CrossSectionalProcessor.rank(result_df)

        return result_df


class CrossSectionalProcessor:
    """Processor to apply cross-sectional transformations to evaluated factor data."""

    @staticmethod
    def rank(df: pd.DataFrame) -> pd.DataFrame:
        """
        Rank signals cross-sectionally for each date.
        Normalizes ranks to percentiles in [0.0, 1.0].
        """
        if df.empty or "signal" not in df.columns:
            return df

        # Copy dataframe and apply cross-sectional percentile rank grouped by date
        df_copy = df.copy()
        df_copy["signal"] = df_copy.groupby("date")["signal"].rank(pct=True)
        return df_copy
