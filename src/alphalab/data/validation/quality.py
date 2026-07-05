"""
alphalab.data.validation.quality
================================
Validates data quality, including sudden price spikes and missing trading gaps.
"""

import logging

from alphalab.common.types import MarketDataset
from alphalab.config.settings import settings
from alphalab.data.validation.base import Validator
from alphalab.data.validation.report import Severity, ValidationReport

logger = logging.getLogger("alphalab.data.validation.quality")


class QualityValidator(Validator):
    """Detects missing trading bars and single-day price jumps exceeding thresholds."""

    def __init__(self, jump_threshold: float = settings.PRICE_JUMP_THRESHOLD) -> None:
        """Initialize the QualityValidator.

        Args:
            jump_threshold: The percentage change (e.g. 0.15) to trigger a jump alert.
        """
        self.jump_threshold = jump_threshold

    def validate(self, dataset: MarketDataset) -> ValidationReport:
        """Evaluate data spikes and relative gaps in stock timeseries.

        Args:
            dataset: The MarketDataset to check.

        Returns:
            ValidationReport enclosing errors or warnings.
        """
        logger.info(
            "[DataIngestion] [QualityValidator] Running data quality validations"
        )
        report = ValidationReport()
        df = dataset.data

        if df.empty:
            return report

        # Resolve the maximum dates available in the dataset for any ticker
        ticker_counts = df.groupby("ticker")["date"].count()
        max_dates = ticker_counts.max()

        for ticker, ticker_df in df.groupby("ticker"):
            ticker_str = str(ticker)
            ticker_df = ticker_df.sort_values("date")

            # 1. Missing Bars (relative to the best-populated ticker in the batch)
            count = len(ticker_df)
            if count < max_dates:
                gap = max_dates - count
                report.add_issue(
                    ticker=ticker_str,
                    issue_type="MISSING_BARS",
                    description=f"Ticker has {gap} fewer trading bars than the dataset maximum ({max_dates})",
                    severity=Severity.WARNING,
                )

            # 2. Suspicious Price Movement (Single-day Price Jump)
            if count > 1:
                # Calculate percentage change on the close price
                close_pct = ticker_df["close"].pct_change().abs()
                suspicious_days = ticker_df[close_pct > self.jump_threshold]

                for _, row in suspicious_days.iterrows():
                    day_change = close_pct.loc[row.name]
                    report.add_issue(
                        ticker=ticker_str,
                        issue_type="PRICE_JUMP",
                        description=(
                            f"Suspicious daily price movement of {day_change * 100:.2f}% "
                            f"on {row['date']} (Threshold: {self.jump_threshold * 100:.1f}%)"
                        ),
                        severity=Severity.WARNING,
                    )

        logger.debug(
            f"[DataIngestion] [QualityValidator] Quality check completed. Captured {len(report.issues)} issues."
        )
        return report
