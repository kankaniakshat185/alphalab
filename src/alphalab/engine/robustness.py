"""
alphalab.engine.robustness
===========================
Defines the robustness stress testing engine for evaluating factor stability.
"""

import logging
from collections.abc import Callable
from datetime import date
from typing import Any

import numpy as np
import pandas as pd

from alphalab.common.exceptions import DataError
from alphalab.common.types import MarketDataset, UniverseEntry
from alphalab.data.storage.base import Storage
from alphalab.data.storage.duckdb import DuckDBStorage
from alphalab.dsl import compile_factor
from alphalab.engine.evaluator import FactorEvaluator
from alphalab.engine.metrics import PerformanceCalculator
from alphalab.engine.portfolio import PortfolioConstructor

logger = logging.getLogger("alphalab.engine.robustness")


class PerturbedStorage(Storage):
    """
    Storage wrapper that intercepts read_ohlcv calls to apply pricing/volume perturbations.
    """

    def __init__(
        self,
        base_storage: Storage,
        perturb_func: Callable[[pd.DataFrame], pd.DataFrame],
    ):
        self.base_storage = base_storage
        self.perturb_func = perturb_func

    def initialize_schema(self) -> None:
        self.base_storage.initialize_schema()

    def write_ohlcv(self, dataset: MarketDataset) -> None:
        self.base_storage.write_ohlcv(dataset)

    def read_ohlcv(
        self, tickers: list[str], start_date: date, end_date: date
    ) -> MarketDataset:
        dataset = self.base_storage.read_ohlcv(tickers, start_date, end_date)
        if not dataset.data.empty:
            perturbed_df = self.perturb_func(dataset.data)
            return MarketDataset(
                data=perturbed_df,
                start_date=dataset.start_date,
                end_date=dataset.end_date,
            )
        return dataset

    def get_available_date_range(self) -> tuple[date, date]:
        return self.base_storage.get_available_date_range()

    def write_universe(self, entries: list[UniverseEntry]) -> None:
        self.base_storage.write_universe(entries)

    def read_universe(
        self, index_name: str, start_date: date, end_date: date
    ) -> list[UniverseEntry]:
        return self.base_storage.read_universe(index_name, start_date, end_date)


def perturb_gaussian(df: pd.DataFrame, noise_level: float) -> pd.DataFrame:
    """
    Add Gaussian noise to price and volume columns.

    Args:
        df: DataFrame containing price records (ohlcv).
        noise_level: Noise standard deviation fraction (e.g. 0.005, 0.01, 0.02).

    Returns:
        Perturbed copy of the DataFrame.
    """
    if df.empty or noise_level <= 0:
        return df.copy()

    perturbed_df = df.copy()

    # Draw Gaussian noise multiplier: 1 + N(0, noise_level^2)
    # Ensure same price multiplier for the same row to maintain bar logic consistency (high >= low etc.)
    price_noise = 1.0 + np.random.normal(0.0, noise_level, size=len(perturbed_df))

    price_cols = ["open", "high", "low", "close", "adj_close"]
    for col in price_cols:
        if col in perturbed_df.columns:
            perturbed_df[col] = perturbed_df[col] * price_noise

    # For high/low consistency (since we used the same noise multiplier, relations should be preserved,
    # but let's be extremely safe and enforce bounds in case rounding or float precision issues occur).
    if "high" in perturbed_df.columns and "low" in perturbed_df.columns:
        perturbed_df["high"] = perturbed_df[["open", "close", "high"]].max(axis=1)
        perturbed_df["low"] = perturbed_df[["open", "close", "low"]].min(axis=1)

    # Volume noise is separate
    if "volume" in perturbed_df.columns:
        volume_noise = 1.0 + np.random.normal(0.0, noise_level, size=len(perturbed_df))
        perturbed_df["volume"] = (perturbed_df["volume"] * volume_noise).clip(lower=1.0)

    return perturbed_df


def perturb_missing_data(
    df: pd.DataFrame, drop_rate: float, chunk_size: int = 5
) -> pd.DataFrame:
    """
    Drop consecutive chunks of date bars per ticker to simulate missing data.

    Args:
        df: DataFrame containing price records (ohlcv).
        drop_rate: Proportion of observations to drop (e.g. 0.05, 0.10, 0.20).
        chunk_size: Consecutive days to drop at once.

    Returns:
        Perturbed copy of the DataFrame with dropped records.
    """
    if df.empty or drop_rate <= 0:
        return df.copy()

    ticker_groups = []
    for _, group in df.groupby("ticker"):
        n = len(group)
        if n == 0:
            ticker_groups.append(group)
            continue

        num_to_drop = int(n * drop_rate)
        if num_to_drop <= 0:
            ticker_groups.append(group)
            continue

        num_chunks = max(1, num_to_drop // chunk_size)
        actual_chunk_size = max(1, num_to_drop // num_chunks)

        indices_to_drop: set[int] = set()
        for _ in range(num_chunks * 3):
            if len(indices_to_drop) >= num_to_drop:
                break
            start_idx = np.random.randint(0, max(1, n - actual_chunk_size))
            for i in range(start_idx, min(n, start_idx + actual_chunk_size)):
                if len(indices_to_drop) >= num_to_drop:
                    break
                indices_to_drop.add(i)

        remaining_needed = num_to_drop - len(indices_to_drop)
        if remaining_needed > 0:
            available_indices = list(set(range(n)) - indices_to_drop)
            if available_indices:
                fill_indices = np.random.choice(
                    available_indices,
                    size=min(len(available_indices), remaining_needed),
                    replace=False,
                )
                indices_to_drop.update(fill_indices)

        keep_indices = [i for i in range(n) if i not in indices_to_drop]
        ticker_groups.append(group.iloc[keep_indices])

    return (
        pd.concat(ticker_groups)
        .sort_values(by=["ticker", "date"])
        .reset_index(drop=True)
    )


class RobustnessEvaluator:
    """Evaluates factor stability under synthetic stress tests."""

    def __init__(self, base_storage: Storage | None = None, num_iterations: int = 3):
        self.base_storage = base_storage or DuckDBStorage()
        self.num_iterations = num_iterations

    def run_robustness(
        self,
        formula: str,
        tickers: list[str],
        start_date: date | None = None,
        end_date: date | None = None,
        baseline_sharpe: float | None = None,
    ) -> dict[str, Any]:
        """
        Run Gaussian noise and missing data stress tests on the given factor formula.

        Args:
            formula: DSL formula string.
            tickers: List of stock tickers to run the test on.
            start_date: Start date of the backtest. Defaults to storage minimum.
            end_date: End date of the backtest. Defaults to storage maximum.
            baseline_sharpe: The baseline Sharpe ratio from the clean backtest. Optional.

        Returns:
            Dictionary containing noise_score, missing_data_score, overall_score, and failure_reasons.
        """
        if not tickers:
            raise DataError("No tickers provided for robustness evaluation.")

        # Compile factor formula
        factor_func = compile_factor(formula)

        # Get start/end dates if not provided
        if start_date is None or end_date is None:
            avail_start, avail_end = self.base_storage.get_available_date_range()
            start_date = start_date or avail_start
            end_date = end_date or avail_end

        # Compute baseline Sharpe if not provided
        if baseline_sharpe is None:
            baseline_sharpe = self._run_perturbed_backtest(
                factor_func, tickers, start_date, end_date, lambda df: df.copy()
            )

        # Noise levels & Missing data levels to test
        noise_levels = [0.005, 0.01, 0.02]  # 0.5%, 1%, 2%
        missing_levels = [0.05, 0.10, 0.20]  # 5%, 10%, 20%

        # 1. Run Noise Stress Tests
        noise_ratios = []
        perturbation_grid = []
        for level in noise_levels:
            level_sharpes = []
            for _ in range(self.num_iterations):
                # Run perturbed backtest
                sharpe = self._run_perturbed_backtest(
                    factor_func,
                    tickers,
                    start_date,
                    end_date,
                    lambda df, lvl=level: perturb_gaussian(df, lvl),  # type: ignore[misc]
                )
                level_sharpes.append(sharpe)
            avg_level_sharpe = sum(level_sharpes) / len(level_sharpes)

            # Robustness ratio: Stressed Sharpe / Baseline Sharpe, clamped to [0.0, 1.0].
            # Scores above 1.0 are semantically invalid — noise cannot make a factor "more robust"
            # than its own clean baseline.
            if baseline_sharpe <= 0.0:
                ratio = 0.0
            else:
                ratio = min(1.0, max(0.0, avg_level_sharpe / baseline_sharpe))
            noise_ratios.append(ratio)
            perturbation_grid.append({
                "perturbation": "noise",
                "level": level,
                "sharpe": float(np.round(avg_level_sharpe, 4)),
                "retention": float(np.round(ratio, 4))
            })

        noise_score = sum(noise_ratios) / len(noise_ratios)

        # 2. Run Missing Data Stress Tests
        missing_ratios = []
        for level in missing_levels:
            level_sharpes = []
            for _ in range(self.num_iterations):
                # Run perturbed backtest
                sharpe = self._run_perturbed_backtest(
                    factor_func,
                    tickers,
                    start_date,
                    end_date,
                    lambda df, lvl=level: perturb_missing_data(df, lvl),  # type: ignore[misc]
                )
                level_sharpes.append(sharpe)
            avg_level_sharpe = sum(level_sharpes) / len(level_sharpes)

            if baseline_sharpe <= 0.0:
                ratio = 0.0
            else:
                ratio = min(1.0, max(0.0, avg_level_sharpe / baseline_sharpe))
            missing_ratios.append(ratio)
            perturbation_grid.append({
                "perturbation": "missing_data",
                "level": level,
                "sharpe": float(np.round(avg_level_sharpe, 4)),
                "retention": float(np.round(ratio, 4))
            })

        missing_data_score = sum(missing_ratios) / len(missing_ratios)

        # 3. Overall Score
        overall_score = (noise_score + missing_data_score) / 2.0

        # 4. Heuristic Failure Reasons
        failure_reasons = self._generate_failure_reasons(
            noise_score, missing_data_score, overall_score, baseline_sharpe
        )

        return {
            "noise_score": float(np.round(noise_score, 4)),
            "missing_data_score": float(np.round(missing_data_score, 4)),
            "overall_score": float(np.round(overall_score, 4)),
            "failure_reasons": failure_reasons,
            "perturbation_grid": perturbation_grid,
        }

    def _run_perturbed_backtest(
        self,
        factor_func: Callable[[pd.DataFrame], pd.Series],
        tickers: list[str],
        start_date: date,
        end_date: date,
        perturb_func: Callable[[pd.DataFrame], pd.DataFrame],
    ) -> float:
        """Helper to run a single backtest with a perturbed storage layer."""
        perturbed_storage = PerturbedStorage(self.base_storage, perturb_func)
        evaluator = FactorEvaluator(perturbed_storage)

        try:
            # 1. Evaluate factor to generate daily raw signals
            signals_df = evaluator.evaluate(factor_func, tickers, start_date, end_date)
            if signals_df.empty:
                return 0.0

            # 2. Construct portfolio target weights
            weights_df = PortfolioConstructor.signals_to_weights(signals_df)
            if weights_df.empty:
                return 0.0

            # 3. Get perturbed prices for return calculations
            prices_dataset = perturbed_storage.read_ohlcv(tickers, start_date, end_date)
            prices_df = prices_dataset.data
            if prices_df.empty:
                return 0.0

            # 4. Calculate returns and metrics
            portfolio_returns = PerformanceCalculator.compute_returns(
                weights_df, prices_df
            )
            metrics = PerformanceCalculator.calculate_metrics(
                portfolio_returns, signals_df, prices_df
            )

            return metrics.get("sharpe", 0.0)
        except Exception as e:
            logger.warning(f"Perturbed backtest failed: {e}")
            return 0.0

    def _generate_failure_reasons(
        self,
        noise_score: float,
        missing_data_score: float,
        overall_score: float,
        baseline_sharpe: float,
    ) -> dict[str, Any]:
        """Generate structured failure analysis heuristics."""
        threshold = 0.70
        is_noise_sensitive = noise_score < threshold
        is_missing_sensitive = missing_data_score < threshold

        if baseline_sharpe <= 0.0:
            dominant_failure = "not_profitable"
            explanation = (
                f"Factor is not profitable at baseline (Sharpe: {baseline_sharpe:.2f}). "
                "Robustness analysis is inconclusive."
            )
            recommendations = ["Review factor logic for basic profitability before assessing robustness."]
        elif is_noise_sensitive and is_missing_sensitive:
            dominant_failure = "both"
            explanation = (
                f"Factor is highly fragile to both pricing noise (score: {noise_score:.2f}) "
                f"and missing data bars (score: {missing_data_score:.2f})."
            )
            recommendations = [
                "Increase lookback window to smooth out daily noise.",
                "Add explicit data imputation for missing price points."
            ]
        elif is_noise_sensitive:
            dominant_failure = "noise_sensitive"
            explanation = (
                f"Factor is sensitive to pricing noise (score: {noise_score:.2f}) "
                f"but stable under missing data (score: {missing_data_score:.2f})."
            )
            recommendations = ["Use moving averages to smooth the raw price input before calculation."]
        elif is_missing_sensitive:
            dominant_failure = "missing_data_sensitive"
            explanation = (
                f"Factor is sensitive to missing data bars (score: {missing_data_score:.2f}) "
                f"but handles pricing noise well (score: {noise_score:.2f})."
            )
            recommendations = ["Use forward-fill or volume-weighted interpolation for missing prices."]
        else:
            dominant_failure = "none"
            explanation = "Factor is highly robust to both noise and missing data."
            recommendations = ["Factor is ready for production scaling."]

        return {
            "dominant_failure": dominant_failure,
            "explanation": explanation,
            "recommendations": recommendations,
            "noise_ratio": float(np.round(noise_score, 2)),
            "missing_data_ratio": float(np.round(missing_data_score, 2)),
        }
